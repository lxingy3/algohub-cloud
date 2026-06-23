import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import {
  analyzeNarrativeTextWithModels,
  analyzeNarrativeTextTask4To7,
} from '../../../../../lib/mlFullAnalysis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id || '').trim()).filter(Boolean) : [];
  const missingOnly = body.missingOnly !== false;
  const limit = Math.min(Math.max(Number(body.limit || 20), 1), 100);
  const tasks = String(body.tasks || '').trim().toLowerCase();
  const jurisdictionId = getJurisdictionId();

  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId,
      ...(ids.length ? { id: { in: ids } } : {}),
    },
    orderBy: { submittedAt: 'asc' },
    take: ids.length ? undefined : limit,
    select: {
      id: true,
      title: true,
      narrativeText: true,
      summary: true,
      transcriptionText: true,
      aiImpactClassification: true,
      aiConfidenceScore: true,
      aiThemes: true,
      aiExtractedExperiences: true,
      aiLinkedAlgorithmIds: true,
      aiProcessedAt: true,
      affectedDomain: true,
      algorithmLinks: { select: { linkType: true } },
    },
  });
  const algorithms = await loadAlgorithmCandidates(jurisdictionId);

  const refreshed = [];
  const skipped = [];

  if (['task4-7', '4-7', 'task6-7', '6-7'].includes(tasks)) {
    for (const testimony of testimonies) {
      if (missingOnly && !isMissingTask4To7(testimony)) {
        skipped.push({ id: testimony.id, title: testimony.title, reason: 'already_complete' });
        continue;
      }

      const text = buildAnalysisText(testimony);
      if (!text) {
        skipped.push({ id: testimony.id, title: testimony.title, reason: 'no_text' });
        continue;
      }

      try {
        const result = await analyzeNarrativeTextTask4To7(text, {
          algorithms,
          affectedDomain: testimony.affectedDomain,
        });
        const update = buildTask4To7Update(testimony, result);
        await prisma.$transaction(async (tx) => {
          await tx.testimony.update({
            where: { id: testimony.id },
            data: update,
          });
          await replaceAiDetectedAlgorithmLinks(tx, testimony.id, result.task6);
        });
        refreshed.push({
          id: testimony.id,
          title: testimony.title,
          status: result.status,
          updatedFields: Object.keys(update),
          skippedTasks: getSkippedTasks(result, ['task4', 'task5', 'task6', 'task7']),
          linkedAlgorithms: (result.task6?.linkedAlgorithms || []).map((link) => ({
            algorithmId: link.algorithmId,
            name: link.name,
            confidence: link.confidence,
          })),
        });
      } catch (error) {
        skipped.push({
          id: testimony.id,
          title: testimony.title,
          reason: error?.message || String(error),
        });
      }
    }

    return NextResponse.json({
      tasks: 'task4-7',
      refreshed: refreshed.length,
      skipped: skipped.length,
      items: refreshed,
      skippedItems: skipped,
    });
  }

  for (const testimony of testimonies) {
    if (missingOnly && !isMissingTask2To7(testimony)) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'already_complete' });
      continue;
    }

    const text = buildAnalysisText(testimony);
    if (!text) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'no_text' });
      continue;
    }

    try {
      const result = await analyzeNarrativeTextWithModels(text, {
        algorithms,
        affectedDomain: testimony.affectedDomain,
      });
      const update = buildMlUpdate(testimony, result);
      await prisma.$transaction(async (tx) => {
        await tx.testimony.update({
          where: { id: testimony.id },
          data: update,
        });
        await replaceAiDetectedAlgorithmLinks(tx, testimony.id, result.task6);
      });
      refreshed.push({
        id: testimony.id,
        title: testimony.title,
        status: result.status,
        updatedFields: Object.keys(update),
        skippedTasks: getSkippedTasks(result),
      });
    } catch (error) {
      skipped.push({
        id: testimony.id,
        title: testimony.title,
        reason: error?.message || String(error),
      });
    }
  }

  return NextResponse.json({
    refreshed: refreshed.length,
    skipped: skipped.length,
    items: refreshed,
    skippedItems: skipped,
  });
}

function buildAnalysisText(testimony) {
  const primaryText = [testimony.transcriptionText, testimony.narrativeText]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  return primaryText || String(testimony.title || '').trim();
}

function isMissingTask4To7(testimony) {
  const entities = testimony.aiExtractedExperiences?.entities || {};
  const keywords = testimony.aiExtractedExperiences?.keywords || [];
  const hasAiDetectedLink = (testimony.algorithmLinks || []).some((link) => link.linkType === 'AI_DETECTED');
  const hasTask4Entities = entityGroups.some((group) => Array.isArray(entities[group]) && entities[group].length > 0);
  return (
    !hasTask4Entities
    || !Array.isArray(keywords)
    || keywords.length === 0
    || !hasAiDetectedLink
    || !testimony.summary
  );
}

function isMissingTask2To7(testimony) {
  const entities = testimony.aiExtractedExperiences?.entities || {};
  const keywords = testimony.aiExtractedExperiences?.keywords || [];
  const hasAiDetectedLink = (testimony.algorithmLinks || []).some((link) => link.linkType === 'AI_DETECTED');
  return (
    !testimony.aiImpactClassification
    || !Number.isFinite(Number(testimony.aiConfidenceScore))
    || !Array.isArray(testimony.aiThemes)
    || testimony.aiThemes.length === 0
    || entityGroups.some((group) => !Array.isArray(entities[group]) || entities[group].length === 0)
    || !Array.isArray(keywords)
    || keywords.length === 0
    || !hasAiDetectedLink
    || !testimony.summary
  );
}

function buildMlUpdate(testimony, result) {
  const priorExperiences = testimony.aiExtractedExperiences && typeof testimony.aiExtractedExperiences === 'object'
    ? testimony.aiExtractedExperiences
    : {};
  const priorEntities = priorExperiences.entities && typeof priorExperiences.entities === 'object'
    ? priorExperiences.entities
    : {};

  const nextEntities = result.task4?.status === 'COMPLETED'
    ? normalizeEntities(result.task4.entities)
    : normalizeEntities(priorEntities);
  const nextKeywords = result.task5?.status === 'COMPLETED'
    ? normalizeStringArray(result.task5.keywords)
    : normalizeStringArray(priorExperiences.keywords);

  return {
    aiImpactClassification: result.task2?.status === 'COMPLETED'
      ? result.task2.aiImpactClassification
      : testimony.aiImpactClassification,
    aiConfidenceScore: result.task2?.status === 'COMPLETED'
      ? Number(result.task2.aiConfidenceScore || 0)
      : testimony.aiConfidenceScore,
    aiThemes: result.task3?.status === 'COMPLETED'
      ? normalizeThemes(result.task3.aiThemes)
      : normalizeThemes(testimony.aiThemes),
    aiExtractedExperiences: {
      entities: nextEntities,
      keywords: nextKeywords,
    },
    aiLinkedAlgorithmIds: result.task6?.status === 'COMPLETED'
      ? normalizeAlgorithmIds(result.task6.linkedAlgorithms)
      : normalizeStringArray(testimony.aiLinkedAlgorithmIds),
    summary: result.task7?.status === 'COMPLETED' && result.task7.summary
      ? result.task7.summary
      : testimony.summary,
    aiProcessedAt: new Date(),
  };
}

function buildTask4To7Update(testimony, result) {
  const priorExperiences = testimony.aiExtractedExperiences && typeof testimony.aiExtractedExperiences === 'object'
    ? testimony.aiExtractedExperiences
    : {};
  const priorEntities = priorExperiences.entities && typeof priorExperiences.entities === 'object'
    ? priorExperiences.entities
    : {};

  const nextEntities = result.task4?.status === 'COMPLETED'
    ? normalizeEntities(result.task4.entities)
    : normalizeEntities(priorEntities);
  const nextKeywords = result.task5?.status === 'COMPLETED'
    ? normalizeStringArray(result.task5.keywords)
    : normalizeStringArray(priorExperiences.keywords);

  return {
    aiExtractedExperiences: {
      entities: nextEntities,
      keywords: nextKeywords,
    },
    aiLinkedAlgorithmIds: result.task6?.status === 'COMPLETED'
      ? normalizeAlgorithmIds(result.task6.linkedAlgorithms)
      : normalizeStringArray(testimony.aiLinkedAlgorithmIds),
    summary: result.task7?.status === 'COMPLETED' && result.task7.summary
      ? result.task7.summary
      : testimony.summary,
    aiProcessedAt: new Date(),
  };
}

async function replaceAiDetectedAlgorithmLinks(tx, testimonyId, task6) {
  if (task6?.status !== 'COMPLETED') return;
  const links = normalizeAlgorithmLinks(task6.linkedAlgorithms);
  await tx.testimonyAlgorithmLink.deleteMany({
    where: {
      testimonyId,
      linkType: 'AI_DETECTED',
    },
  });
  if (!links.length) return;
  await tx.testimonyAlgorithmLink.createMany({
    data: links.map((link) => ({
      testimonyId,
      algorithmId: link.algorithmId,
      linkType: 'AI_DETECTED',
      confidence: link.confidence,
    })),
    skipDuplicates: true,
  });
}

async function loadAlgorithmCandidates(jurisdictionId) {
  return prisma.algorithm.findMany({
    where: { jurisdictionId },
    select: {
      id: true,
      name: true,
      useCase: true,
      description: true,
      purpose: true,
      agencyName: true,
      dataUsed: true,
      decisionType: true,
    },
  });
}

function normalizeAlgorithmIds(value) {
  return normalizeAlgorithmLinks(value).map((link) => link.algorithmId);
}

function normalizeAlgorithmLinks(value) {
  return Array.isArray(value)
    ? value
        .map((link) => ({
          algorithmId: String(link?.algorithmId || '').trim(),
          confidence: Number(link?.confidence || 0),
        }))
        .filter((link) => link.algorithmId)
    : [];
}

function normalizeThemes(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEntities(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(entityGroups.map((group) => [group, normalizeStringArray(source[group])]));
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];
}

function getSkippedTasks(result, taskKeys = ['task2', 'task3', 'task4', 'task5', 'task6', 'task7']) {
  return taskKeys
    .filter((key) => result[key]?.status !== 'COMPLETED')
    .map((key) => ({ task: key, error: result[key]?.error || 'not completed' }));
}
