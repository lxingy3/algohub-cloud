import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { analyzeNarrativeTextWithModels } from '../../../../../lib/mlFullAnalysis';

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
    },
  });

  const refreshed = [];
  const skipped = [];

  for (const testimony of testimonies) {
    if (missingOnly && !isMissingTask2To5(testimony)) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'already_complete' });
      continue;
    }

    const text = [testimony.transcriptionText, testimony.narrativeText, testimony.summary, testimony.title]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (!text) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'no_text' });
      continue;
    }

    try {
      const result = await analyzeNarrativeTextWithModels(text);
      const update = buildMlUpdate(testimony, result);
      await prisma.testimony.update({
        where: { id: testimony.id },
        data: update,
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

function isMissingTask2To5(testimony) {
  const entities = testimony.aiExtractedExperiences?.entities || {};
  const keywords = testimony.aiExtractedExperiences?.keywords || [];
  return (
    !testimony.aiImpactClassification
    || !Number.isFinite(Number(testimony.aiConfidenceScore))
    || !Array.isArray(testimony.aiThemes)
    || testimony.aiThemes.length === 0
    || entityGroups.some((group) => !Array.isArray(entities[group]) || entities[group].length === 0)
    || !Array.isArray(keywords)
    || keywords.length === 0
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
    aiProcessedAt: new Date(),
  };
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

function getSkippedTasks(result) {
  return ['task2', 'task3', 'task4', 'task5']
    .filter((key) => result[key]?.status !== 'COMPLETED')
    .map((key) => ({ task: key, error: result[key]?.error || 'not completed' }));
}
