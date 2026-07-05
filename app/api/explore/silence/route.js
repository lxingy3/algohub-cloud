import { NextResponse } from 'next/server';
import { getAlgorithmLandscape, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

const impactWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const algorithms = await getAlgorithmLandscape(filters);
  const stories = await getApprovedBriefingCorpus(filters);
  const storiesByDomain = new Map();
  for (const story of stories) {
    const domain = story.affectedDomain || story.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain';
    storiesByDomain.set(domain, (storiesByDomain.get(domain) || 0) + 1);
  }
  const requestedPriority = filters.silencePriority.toLowerCase();
  const priorityFilter = ['high', 'medium', 'low'].includes(requestedPriority) ? requestedPriority : '';
  const rows = algorithms.map((algorithm) => {
    const volumeGap = algorithm.approvedTestimonyCount === 0 ? 1 : algorithm.approvedTestimonyCount < 3 ? 0.6 : algorithm.approvedTestimonyCount < 6 ? 0.3 : 0;
    const domainCount = storiesByDomain.get(algorithm.useCase) || 0;
    const domainGap = domainCount === 0 ? 1 : domainCount < 3 ? 0.6 : domainCount < 6 ? 0.3 : 0;
    const semanticGap = algorithm.approvedTestimonyCount === 0 ? 1 : algorithm.approvedTestimonyCount < 3 ? 0.5 : 0.15;
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
      factors: {
        volumeGap,
        semanticGap,
        domainGap,
        impactWeight: Number((weight / 3).toFixed(2)),
      },
      priority: silenceScore >= 0.6 ? 'high' : silenceScore >= 0.3 ? 'medium' : 'low',
      possibleReasons: algorithm.approvedTestimonyCount === 0
        ? ['no approved stories linked yet']
        : algorithm.approvedTestimonyCount < 3
          ? ['thin testimony volume']
          : [],
    };
  }).filter((row) => !priorityFilter || row.priority === priorityFilter)
    .sort((a, b) => b.silenceScore - a.silenceScore || a.algorithmName.localeCompare(b.algorithmName));

  return NextResponse.json({
    label: 'suggested silence review queue',
    method: 'rule-based 4-factor proxy; semantic_gap can be replaced with embedding coverage when vectors are available server-side',
    rows,
  });
}
