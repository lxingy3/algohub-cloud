import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { analyzeNarrativeTextWithModels } from '../../../../../lib/mlFullAnalysis';
import { prepareMlAnalysisInput, selectTestimonyAnalysisText } from '../../../../../lib/mlAnalysisInput';
import {
  buildAlgorithmMatchResultFromAnalysis,
  getAlgorithmCatalogVersion,
  loadAlgorithmMatchCatalog,
} from '../../../../../lib/algorithmMatcher';
import {
  getSkippedTasks,
  isMissingTask2To5,
  isStoredAlgorithmMatchComplete,
  persistTestimonyAlgorithmMatch,
  persistTestimonyMlResult,
  storedAnalysisResult,
} from '../../../../../lib/testimonyMlPersistence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
      affectedDomain: true,
      aiLinkedAlgorithmIds: true,
      algorithmLinks: {
        select: {
          algorithmId: true,
          linkType: true,
          algorithm: { select: { useCase: true } },
        },
      },
    },
  });

  const algorithms = await loadAlgorithmMatchCatalog(prisma, jurisdictionId);
  const algorithmCatalogVersion = getAlgorithmCatalogVersion(algorithms);

  const refreshed = [];
  const skipped = [];

  for (const testimony of testimonies) {
    if (!ids.length && refreshed.length >= limit) break;
    const task2To5Missing = isMissingTask2To5(testimony);
    const algorithmMatchMissing = !isStoredAlgorithmMatchComplete(testimony, algorithmCatalogVersion);
    if (missingOnly && !task2To5Missing && !algorithmMatchMissing) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'already_complete' });
      continue;
    }

    const sourceText = selectTestimonyAnalysisText(testimony);
    if (!sourceText) {
      skipped.push({ id: testimony.id, title: testimony.title, reason: 'no_text' });
      continue;
    }

    try {
      const refreshTask2To5 = task2To5Missing || !missingOnly;
      const analysisInput = await prepareMlAnalysisInput(sourceText);
      const result = refreshTask2To5
        ? await analyzeNarrativeTextWithModels(analysisInput.text)
        : storedAnalysisResult(testimony);
      const skippedTasks = getSkippedTasks(result);
      if (refreshTask2To5 && skippedTasks.length) {
        skipped.push({
          id: testimony.id,
          title: testimony.title,
          reason: 'task2_to_5_partial',
          skippedTasks,
        });
        continue;
      }
      const affectedDomain = testimony.affectedDomain
        || testimony.algorithmLinks.find((link) => link.linkType !== 'AI_DETECTED')?.algorithm?.useCase
        || '';
      const algorithmMatching = buildAlgorithmMatchResultFromAnalysis({
        analysis: result,
        narrativeText: analysisInput.text,
        title: testimony.title,
        affectedDomain,
        algorithms,
      });
      const update = refreshTask2To5
        ? await persistTestimonyMlResult({ prisma, testimony, result, algorithmMatching })
        : await persistTestimonyAlgorithmMatch({ prisma, testimony, algorithmMatching });
      refreshed.push({
        id: testimony.id,
        title: testimony.title,
        status: result.status,
        updatedFields: [...Object.keys(update), 'algorithmLinks'],
        algorithmMatches: algorithmMatching.matches,
        skippedTasks,
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
