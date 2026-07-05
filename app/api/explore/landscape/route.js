import { NextResponse } from 'next/server';
import { countBy, getAlgorithmLandscape, getApprovedBriefingCorpus } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [algorithms, testimonies] = await Promise.all([getAlgorithmLandscape(), getApprovedBriefingCorpus()]);
  return NextResponse.json({
    totalAlgorithms: algorithms.length,
    totalApprovedStories: testimonies.length,
    algorithms,
    byDomain: countBy(algorithms, (row) => row.useCase),
    byAgency: countBy(algorithms, (row) => row.agencyName),
    byImpactLevel: countBy(algorithms, (row) => row.impactLevel),
  });
}

