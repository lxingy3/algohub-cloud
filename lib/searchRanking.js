const NON_TOKEN_CHARS = /[^\p{L}\p{N}]+/gu;
const COMBINING_MARKS = /[\u0300-\u036f]/g;

function normalizeValue(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase();
}

export function searchTokens(query) {
  return [...new Set(normalizeValue(query).split(NON_TOKEN_CHARS).filter(Boolean))];
}

function labelFromEnum(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function impactLabel(value) {
  return value ? `${labelFromEnum(value)} Impact` : '';
}

function bucketFor(values) {
  const counts = new Map();

  for (const value of values.flat()) {
    for (const token of searchTokens(value)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  return counts;
}

function scoreBucket(values, queryTokens) {
  const counts = bucketFor(values);
  const matched = queryTokens.every((token) => counts.has(token));

  return {
    matched,
    count: matched ? queryTokens.reduce((sum, token) => sum + (counts.get(token) || 0), 0) : 0,
  };
}

function scoreRankedItem(item, queryTokens, buckets) {
  const title = scoreBucket(buckets.title, queryTokens);
  if (title.matched) return { item, rank: 0, count: title.count };

  const core = scoreBucket([...buckets.title, ...buckets.core], queryTokens);
  if (core.matched) return { item, rank: 1, count: core.count };

  const related = scoreBucket([...buckets.title, ...buckets.core, ...buckets.related], queryTokens);
  if (related.matched) return { item, rank: 2, count: related.count };

  return null;
}

function sortRankedItems(a, b, fallbackSort) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.count !== b.count) return b.count - a.count;
  return fallbackSort(a.item, b.item);
}

export function rankAlgorithmsForSearch(algorithms, query) {
  const queryTokens = searchTokens(query);
  if (!queryTokens.length) return algorithms;

  return algorithms
    .map((algorithm) => scoreRankedItem(algorithm, queryTokens, {
      title: [algorithm.name],
      core: [
        algorithm.description,
        algorithm.purpose,
        algorithm.agencyName,
        algorithm.agencyType,
        algorithm.useCase,
        algorithm.location,
        algorithm.yearIntroduced,
        algorithm.yearDeployed,
        labelFromEnum(algorithm.status),
        algorithm.currentVersion,
        impactLabel(algorithm.impactLevel),
      ],
      related: [
        ...(algorithm.claims || []).flatMap((claim) => [claim.claimText, claim.claimSource]),
        ...(algorithm.documents || []).flatMap((document) => [document.title, document.rawText]),
      ],
    }))
    .filter(Boolean)
    .sort((a, b) => sortRankedItems(a, b, (left, right) => String(left.name || '').localeCompare(String(right.name || ''))))
    .map(({ item }) => item);
}

export function rankStoriesForSearch(stories, query) {
  const queryTokens = searchTokens(query);
  if (!queryTokens.length) return stories;

  return stories
    .map((story) => scoreRankedItem(story, queryTokens, {
      title: [story.title],
      core: [
        story.narrativeText,
        story.summary,
        story.affectedDomain,
        story.city,
        story.aiImpactClassification,
        labelFromEnum(story.selfReportedImpact),
        story.transcriptionText,
      ],
      related: [
        story.brief?.summary,
      ],
    }))
    .filter(Boolean)
    .sort((a, b) => sortRankedItems(a, b, (left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0)))
    .map(({ item }) => item);
}
