import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus, minGroupCountForLens, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { BRIEFINGS_EMBEDDING_MODEL, getSemanticEmbeddingMap } from '../../../../lib/semanticEmbeddings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
  const [briefings, embeddings] = await Promise.all([prisma.briefing.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      ...(filters.algorithm ? { targetAlgorithm: { slug: filters.algorithm } } : {}),
    },
    select: {
      reviewStatus: true,
      generatedBy: true,
      reviewedByUserId: true,
    },
  }), getSemanticEmbeddingMap('testimony', rows.map((row) => row.id))]);
  const dates = rows.map((row) => row.submittedAt).filter(Boolean).sort((a, b) => a - b);
  const latestEmbedding = [...embeddings.values()].map((row) => row.generatedAt).filter(Boolean).sort((a, b) => a - b).at(-1) || null;
  const count = (predicate) => rows.filter(predicate).length;

  return NextResponse.json({
    label: 'provenance and paradata',
    method: 'metadata coverage counts over approved stories and reviewed briefing rows',
    total: rows.length,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    submissionMethod: countBy(rows, (row) => row.submissionMethod, { minCount }),
    language: countBy(rows, (row) => row.originalLanguage, { minCount }),
    domain: countBy(rows, (row) => row.affectedDomain, { minCount }),
    neighbourhood: countBy(rows, (row) => row.neighbourhood, { minCount }),
    partnerOrganization: countBy(rows, (row) => row.partnerOrganization?.name, { minCount }),
    briefings: {
      total: briefings.length,
      reviewStatus: countBy(briefings, (row) => row.reviewStatus),
      generatedBy: countBy(briefings, (row) => row.generatedBy),
      reviewerStatus: countBy(briefings, (row) => row.reviewedByUserId ? 'reviewed' : 'not reviewed'),
    },
    processingCoverage: {
      impactClassified: count((row) => Boolean(row.aiImpactClassification)),
      themesAssigned: count((row) => Array.isArray(row.aiThemes) && row.aiThemes.length > 0),
      summariesAvailable: count((row) => Boolean(row.brief?.summary || row.summary)),
      entitiesExtracted: count((row) => Boolean(row.aiExtractedExperiences?.entities)),
      perTestimonyProcessed: count((row) => Boolean(row.aiProcessedAt)),
      corpusMapped: count((row) => row.clusterId !== null && Number.isFinite(row.umapX) && Number.isFinite(row.umapY)),
      topicAssigned: count((row) => row.topicId !== null),
      outliers: count((row) => row.isOutlier),
      semanticEmbeddings: embeddings.size,
      totalApprovedStories: rows.length,
      embeddingModel: BRIEFINGS_EMBEDDING_MODEL,
      lastEmbeddingBatchAt: latestEmbedding,
    },
    whatsMissing: {
      noNeighbourhood: rows.filter((row) => !row.neighbourhood).length,
      noPartnerOrganization: rows.filter((row) => !row.partnerOrganization).length,
      noAlgorithmLink: rows.filter((row) => row.algorithmLinks.length === 0).length,
      noAiThemes: rows.filter((row) => !Array.isArray(row.aiThemes) || row.aiThemes.length === 0).length,
      nonEnglish: rows.filter((row) => row.originalLanguage && row.originalLanguage !== 'en').length,
    },
  });
}
