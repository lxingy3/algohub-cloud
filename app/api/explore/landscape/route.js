import { NextResponse } from 'next/server';
import { countBy, getAlgorithmLandscape, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const [algorithms, testimonies] = await Promise.all([getAlgorithmLandscape(filters), getApprovedBriefingCorpus(filters)]);
  const filteredStoryCounts = new Map();
  for (const testimony of testimonies) {
    for (const link of testimony.algorithmLinks) {
      filteredStoryCounts.set(link.algorithm.id, (filteredStoryCounts.get(link.algorithm.id) || 0) + 1);
    }
  }
  const filteredAlgorithms = algorithms.map((algorithm) => ({
    ...algorithm,
    approvedTestimonyCount: filteredStoryCounts.get(algorithm.id) || 0,
  }));
  return NextResponse.json({
    method: 'database aggregation over reviewed algorithm cards and approved story counts',
    totalAlgorithms: filteredAlgorithms.length,
    totalApprovedStories: testimonies.length,
    algorithms: filteredAlgorithms,
    byDomain: countBy(filteredAlgorithms, (row) => row.useCase),
    byAgency: countBy(filteredAlgorithms, (row) => row.agencyName),
    byImpactLevel: countBy(filteredAlgorithms, (row) => row.impactLevel),
  });
}
