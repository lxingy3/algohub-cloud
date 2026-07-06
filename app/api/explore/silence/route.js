import { NextResponse } from 'next/server';
import { getAlgorithmLandscape, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

const impactWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const algorithms = await getAlgorithmLandscape(filters);
  const stories = await getApprovedBriefingCorpus(filters);
  const storiesByDomain = new Map();
  const storiesByAlgorithm = new Map();
  for (const story of stories) {
    const domain = story.affectedDomain || story.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain';
    storiesByDomain.set(domain, (storiesByDomain.get(domain) || 0) + 1);
    for (const link of story.algorithmLinks) {
      const current = storiesByAlgorithm.get(link.algorithm.slug) || [];
      current.push(story);
      storiesByAlgorithm.set(link.algorithm.slug, current);
    }
  }
  const requestedPriority = filters.silencePriority.toLowerCase();
  const priorityFilter = ['high', 'medium', 'low'].includes(requestedPriority) ? requestedPriority : '';
  const rows = algorithms.map((algorithm) => {
    const volumeGap = algorithm.approvedTestimonyCount === 0 ? 1 : algorithm.approvedTestimonyCount < 3 ? 0.6 : algorithm.approvedTestimonyCount < 6 ? 0.3 : 0;
    const domainCount = storiesByDomain.get(algorithm.useCase) || 0;
    const domainGap = domainCount === 0 ? 1 : domainCount < 3 ? 0.6 : domainCount < 6 ? 0.3 : 0;
    const linkedStories = storiesByAlgorithm.get(algorithm.slug) || [];
    const corpusTopicCount = new Set(linkedStories.map((story) => story.topicId).filter((id) => id !== null)).size;
    const corpusClusterCount = new Set(linkedStories.map((story) => story.clusterId).filter((id) => id !== null)).size;
    const semanticGap = semanticCoverageGap(linkedStories.length, corpusTopicCount, corpusClusterCount);
    const weight = impactWeight[algorithm.impactLevel] || 1;
    const silenceScore = Number(Math.min(1, ((volumeGap * 0.45) + (domainGap * 0.25) + (semanticGap * 0.3)) * weight / 3).toFixed(2));
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
        corpusTopicCount,
        corpusClusterCount,
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
    method: 'rule-based volume/domain score plus offline sentence-transformers topic/cluster coverage',
    rows,
  });
}

function semanticCoverageGap(storyCount, topicCount, clusterCount) {
  if (!storyCount) return 1;
  if (!topicCount && !clusterCount) return 0.65;
  if (topicCount + clusterCount <= 1) return 0.45;
  if (topicCount < 2 || clusterCount < 2) return 0.25;
  return 0.1;
}
