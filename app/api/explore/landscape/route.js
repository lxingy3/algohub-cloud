import { NextResponse } from 'next/server';
import { countBy, getAlgorithmLandscape, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const [algorithms, testimonies] = await Promise.all([getAlgorithmLandscape(filters), getApprovedBriefingCorpus(filters)]);
  return NextResponse.json({
    method: 'database aggregation over reviewed algorithm cards and approved story counts',
    totalAlgorithms: algorithms.length,
    totalApprovedStories: testimonies.length,
    algorithms,
    byDomain: countBy(algorithms, (row) => row.useCase),
    byAgency: countBy(algorithms, (row) => row.agencyName),
    byImpactLevel: countBy(algorithms, (row) => row.impactLevel),
  });
}
