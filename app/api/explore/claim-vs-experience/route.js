import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, parseExploreFilters, storyTitle } from '../../../../lib/briefingsExplore';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const jurisdictionId = getJurisdictionId();
  const algorithms = await prisma.algorithm.findMany({
    where: {
      jurisdictionId,
      ...(filters.algorithm ? { slug: filters.algorithm } : {}),
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
        experienceExamples: stories.slice(0, 3).map((story) => ({
          id: story.id,
          title: storyTitle(story),
          impact: story.aiImpactClassification,
          excerpt: anonymizedExcerpt(story),
        })),
      };
    }).filter((row) => row.claims.length || row.experienceCount),
  });
}

