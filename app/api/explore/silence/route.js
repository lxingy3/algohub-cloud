import { NextResponse } from 'next/server';
import { getAlgorithmLandscape, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

const impactWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export async function GET(request) {
  const algorithms = await getAlgorithmLandscape(parseExploreFilters(request));
  const rows = algorithms.map((algorithm) => {
    const volumeGap = algorithm.approvedTestimonyCount === 0 ? 1 : algorithm.approvedTestimonyCount < 3 ? 0.6 : algorithm.approvedTestimonyCount < 6 ? 0.3 : 0;
    const weight = impactWeight[algorithm.impactLevel] || 1;
    const silenceScore = Number(Math.min(1, volumeGap * weight / 3).toFixed(2));
    return {
      algorithmSlug: algorithm.slug,
      algorithmName: algorithm.name,
      useCase: algorithm.useCase,
      agencyName: algorithm.agencyName,
      impactLevel: algorithm.impactLevel,
      approvedTestimonyCount: algorithm.approvedTestimonyCount,
      silenceScore,
      priority: silenceScore >= 0.6 ? 'high' : silenceScore >= 0.3 ? 'medium' : 'low',
      possibleReasons: algorithm.approvedTestimonyCount === 0
        ? ['no approved stories linked yet']
        : algorithm.approvedTestimonyCount < 3
          ? ['thin testimony volume']
          : [],
    };
  }).sort((a, b) => b.silenceScore - a.silenceScore || a.algorithmName.localeCompare(b.algorithmName));

  return NextResponse.json({ label: 'suggested silence review queue', rows });
}
