import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, parseExploreFilters, storyTitle } from '../../../../lib/briefingsExplore';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const jurisdictionId = getJurisdictionId();
  const cachedRows = await cachedClaimRows({ jurisdictionId, filters });
  if (cachedRows.length) {
    return NextResponse.json({
      label: 'claim vs experience cache',
      reviewStatus: 'published briefing cache',
      rows: cachedRows,
    });
  }
  const algorithms = await prisma.algorithm.findMany({
    where: {
      jurisdictionId,
      ...(filters.algorithm ? { slug: filters.algorithm } : {}),
      ...(filters.agency ? { agencyName: { contains: filters.agency, mode: 'insensitive' } } : {}),
      ...(filters.domain ? { useCase: filters.domain } : {}),
      ...(filters.impactLevel ? { impactLevel: filters.impactLevel } : {}),
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
    },
    select: { id: true, slug: true, name: true, claims: { orderBy: { createdAt: 'desc' }, take: 3 } },
    orderBy: { name: 'asc' },
  });
  const rows = await getApprovedBriefingCorpus(filters);
  const rowsByAlgorithm = new Map();
  for (const row of rows) {
    for (const link of row.algorithmLinks) {
      const current = rowsByAlgorithm.get(link.algorithm.id) || [];
      current.push(row);
      rowsByAlgorithm.set(link.algorithm.id, current);
    }
  }

  return NextResponse.json({
    label: 'claim vs experience draft',
    reviewStatus: 'needs human review',
    rows: algorithms.map((algorithm) => {
      const stories = rowsByAlgorithm.get(algorithm.id) || [];
      return {
        algorithmSlug: algorithm.slug,
        algorithmName: algorithm.name,
        claims: algorithm.claims.map((claim) => ({ text: claim.claimText, source: claim.claimSource, date: claim.claimDate })),
        experienceCount: stories.length,
        experienceExamples: filters.lens === 'government' ? [] : stories.slice(0, 3).map((story) => ({
          id: story.id,
          title: storyTitle(story),
          impact: story.aiImpactClassification,
          excerpt: anonymizedExcerpt(story),
        })),
      };
    }).filter((row) => row.claims.length || row.experienceCount),
  });
}

async function cachedClaimRows({ jurisdictionId, filters }) {
  const briefing = await prisma.briefing.findFirst({
    where: {
      jurisdictionId,
      reviewStatus: 'PUBLISHED',
      briefingType: filters.algorithm ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING',
      ...(filters.algorithm ? { targetAlgorithm: { slug: filters.algorithm } } : { targetAlgorithmId: null }),
    },
    orderBy: { publishedAt: 'desc' },
    select: { claimVsExperience: true },
  });
  const rows = Array.isArray(briefing?.claimVsExperience) ? briefing.claimVsExperience : [];
  return rows.map((row, index) => {
    if (typeof row === 'string') {
      return { algorithmSlug: null, algorithmName: `Briefing note ${index + 1}`, claims: [{ text: row }], experienceCount: null, experienceExamples: [] };
    }
    return {
      algorithmSlug: row.algorithmSlug || null,
      algorithmName: row.algorithmName || row.algorithmSlug || `Briefing note ${index + 1}`,
      claims: Array.isArray(row.claims) ? row.claims : [],
      experienceCount: row.experienceCount ?? null,
      experienceExamples: Array.isArray(row.experienceExamples) ? row.experienceExamples : [],
      discrepancy: row.discrepancy || row.summary || null,
    };
  });
}
