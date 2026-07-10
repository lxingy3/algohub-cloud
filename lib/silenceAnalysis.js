import { cosineSimilarity, SEMANTIC_RELEVANCE_THRESHOLD } from './semanticEmbeddings.js';
import { canonicalBriefingDomain, compatibleBriefingDomain } from './briefingDomainMatch.js';

const IMPACT_WEIGHT = { HIGH: 1.5, MEDIUM: 1, LOW: 0.5 };
const DOMAIN_MULTIPLIERS = [
  ['fraud detection', 1.4],
  ['child welfare', 1.3],
  ['public safety', 1.3],
  ['emergency', 1.3],
  ['transit safety', 1.3],
  ['traffic management', 1.3],
  ['housing', 1.5],
  ['benefits', 1.5],
  ['employment', 1.2],
  ['job matching', 1.2],
  ['education', 1.1],
  ['student', 1.1],
];

export function buildSilenceAnalysis({ algorithms, stories, algorithmEmbeddings = new Map(), storyEmbeddings = new Map() }) {
  const storiesByDomain = new Map();
  const storiesByAlgorithm = new Map();
  const algorithmsByDomain = new Map();
  for (const algorithm of algorithms) {
    const domain = canonicalBriefingDomain(algorithm.useCase);
    algorithmsByDomain.set(domain, (algorithmsByDomain.get(domain) || 0) + 1);
  }
  for (const story of stories) {
    const domain = canonicalBriefingDomain(story.affectedDomain || story.algorithmLinks?.[0]?.algorithm?.useCase || 'Unknown domain');
    storiesByDomain.set(domain, (storiesByDomain.get(domain) || 0) + 1);
    for (const link of story.algorithmLinks || []) {
      const key = link.algorithm?.slug || link.algorithm?.id;
      if (!key) continue;
      const current = storiesByAlgorithm.get(key) || [];
      current.push(story);
      storiesByAlgorithm.set(key, current);
    }
  }

  const rows = algorithms.map((algorithm) => {
    const linkedStories = storiesByAlgorithm.get(algorithm.slug || algorithm.id) || [];
    const approvedCount = Number.isFinite(Number(algorithm.approvedTestimonyCount))
      ? Number(algorithm.approvedTestimonyCount)
      : linkedStories.length;
    const expectedVolume = expectedTestimonyVolume(algorithm.impactLevel, deploymentAge(algorithm.yearDeployed), algorithm.useCase);
    const volumeGap = round(1 - Math.min(approvedCount / Math.max(expectedVolume, 1), 1));
    const algorithmDomain = canonicalBriefingDomain(algorithm.useCase);
    const domainCount = storiesByDomain.get(algorithmDomain) || 0;
    const domainAlgoCount = algorithmsByDomain.get(algorithmDomain) || 1;
    const domainGap = round(Math.max(0, 1 - domainCount / Math.max(domainAlgoCount * 5, 1)));
    const algorithmVector = algorithmEmbeddings.get(algorithm.id)?.vector;
    const canUseSemanticCache = Boolean(algorithmVector && storyEmbeddings.size > 0);
    const relevantStoryCount = canUseSemanticCache
      ? stories.filter((story) => {
        const linked = story.algorithmLinks?.some((link) => (
          link.algorithm?.id === algorithm.id || link.algorithm?.slug === algorithm.slug
        ));
        if (!linked && !compatibleBriefingDomain(story.affectedDomain, algorithm.useCase)) return false;
        const similarity = cosineSimilarity(algorithmVector, storyEmbeddings.get(story.id)?.vector);
        return Number.isFinite(similarity) && similarity > SEMANTIC_RELEVANCE_THRESHOLD;
      }).length
      : 0;
    const semanticGap = canUseSemanticCache
      ? round(1 - Math.min(relevantStoryCount / Math.max(expectedVolume, 1), 1))
      : semanticCoverageFallback(linkedStories);
    const weight = IMPACT_WEIGHT[algorithm.impactLevel] || 1;
    const silenceScore = round(Math.min(1, weight * ((volumeGap * 0.4) + (semanticGap * 0.3) + (domainGap * 0.3))));
    return {
      algorithmId: algorithm.id,
      algorithmSlug: algorithm.slug,
      algorithmName: algorithm.name,
      useCase: algorithm.useCase,
      agencyName: algorithm.agencyName,
      impactLevel: algorithm.impactLevel,
      approvedTestimonyCount: approvedCount,
      expectedVolume,
      silenceScore,
      factors: {
        volumeGap,
        semanticGap,
        domainGap,
        impactWeight: weight,
        relevantStoryCount,
        relevanceThreshold: SEMANTIC_RELEVANCE_THRESHOLD,
        semanticSource: canUseSemanticCache ? 'sentence-transformers cosine' : 'topic/cluster/UMAP fallback',
      },
      priority: silenceScore > 0.8 ? 'critical' : silenceScore > 0.6 ? 'high' : 'medium',
      possibleReasons: possibleReasons({
        algorithmName: algorithm.name,
        approvedCount,
        domainGap,
        impactLevel: algorithm.impactLevel,
        semanticGap,
        useCase: algorithm.useCase,
      }),
    };
  }).sort((a, b) => b.silenceScore - a.silenceScore || a.algorithmName.localeCompare(b.algorithmName));

  return {
    rows,
    semanticCacheUsed: storyEmbeddings.size > 0 && algorithms.every((algorithm) => algorithmEmbeddings.has(algorithm.id)),
  };
}

function deploymentAge(yearDeployed) {
  const year = Number(yearDeployed);
  if (!Number.isFinite(year)) return 1;
  return Math.max(1, new Date().getUTCFullYear() - year);
}

function expectedTestimonyVolume(impactLevel, yearsDeployed, useCase) {
  const base = { HIGH: 8, MEDIUM: 5, LOW: 3 }[impactLevel] || 5;
  const normalizedUseCase = String(useCase || '').toLowerCase();
  const domainMultiplier = DOMAIN_MULTIPLIERS.find(([domain]) => normalizedUseCase.includes(domain))?.[1] || 1;
  const ageMultiplier = 1 + (Math.min(Math.max(yearsDeployed - 1, 0), 4) * 0.1);
  return Math.max(3, Math.round(base * ageMultiplier * domainMultiplier));
}

function semanticCoverageFallback(stories) {
  if (!stories.length) return 1;
  const topicCount = new Set(stories.map((story) => story.topicId).filter((id) => id !== null && id !== undefined)).size;
  const clusterCount = new Set(stories.map((story) => story.clusterId).filter((id) => id !== null && id !== undefined)).size;
  const spread = umapSpread(stories);
  if (!topicCount && !clusterCount) return 0.65;
  const diversityGap = topicCount + clusterCount <= 1 ? 0.45 : topicCount < 2 || clusterCount < 2 ? 0.25 : 0.1;
  const spreadGap = spread === null ? 0.25 : spread < 0.8 ? 0.35 : spread < 1.8 ? 0.2 : 0.1;
  return round(Math.max(0.1, Math.min(0.65, (diversityGap + spreadGap) / 2)));
}

function umapSpread(stories) {
  const points = stories.map((story) => ({ x: Number(story.umapX), y: Number(story.umapY) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2) return null;
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return points.reduce((sum, point) => sum + Math.hypot(point.x - centerX, point.y - centerY), 0) / points.length;
}

function possibleReasons({ algorithmName, approvedCount, domainGap, impactLevel, semanticGap, useCase }) {
  const reasons = [];
  if (!approvedCount) reasons.push('No approved stories are linked to this system yet.');
  if (domainGap > 0.7) reasons.push(`The ${useCase} domain is underrepresented in the current story set.`);
  if (['Child Welfare', 'Public Safety', 'Fraud Detection'].includes(useCase)) {
    reasons.push(`People affected by ${useCase.toLowerCase()} systems may face barriers or fear consequences when sharing their experience.`);
  }
  if (impactLevel === 'HIGH' && approvedCount < 3) reasons.push('This high-impact system has fewer than three approved stories.');
  if (semanticGap > 0.6 && approvedCount > 0) reasons.push(`Related stories do not cover much of ${algorithmName}'s documented scope.`);
  if (!reasons.length) reasons.push('Story volume is below the expected baseline for this system.');
  return reasons;
}

function round(value) {
  return Number(Number(value).toFixed(2));
}
