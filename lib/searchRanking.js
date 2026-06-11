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
  let searchableValues = [];

  for (const [rank, values] of buckets.entries()) {
    searchableValues = [...searchableValues, ...values];
    const score = scoreBucket(searchableValues, queryTokens);
    if (score.matched) return { item, rank, count: score.count };
  }

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
    .map((algorithm) => {
      const relatedStories = algorithm.relatedStories || (algorithm.testimonyLinks || []).map((link) => link.testimony).filter(Boolean);

      return scoreRankedItem(algorithm, queryTokens, [
        [algorithm.name],
        [algorithm.useCase, algorithm.location],
        [
          algorithm.name,
          algorithm.agencyName,
          algorithm.yearIntroduced,
          algorithm.useCase,
          algorithm.location,
          impactLabel(algorithm.impactLevel),
        ],
        [
          algorithm.purpose,
          algorithm.dataUsed,
          algorithm.decisionType,
          algorithm.yearDeployed,
          labelFromEnum(algorithm.status),
          algorithm.currentVersion,
        ],
        [
          ...(algorithm.documents || []).flatMap((document) => [
            document.title,
            labelFromEnum(document.sourceType),
            document.rawText,
          ]),
        ],
        [
          ...(algorithm.claims || []).flatMap((claim) => [claim.claimText, claim.claimSource]),
        ],
        [
          ...(relatedStories || []).flatMap((story) => [story.title, story.summary, story.narrativeText]),
        ],
      ]);
    })
    .filter(Boolean)
    .sort((a, b) => sortRankedItems(a, b, (left, right) => String(left.name || '').localeCompare(String(right.name || ''))))
    .map(({ item }) => item);
}

export function rankStoriesForSearch(stories, query) {
  const queryTokens = searchTokens(query);
  if (!queryTokens.length) return stories;

  return stories
    .map((story) => scoreRankedItem(story, queryTokens, [
      [story.title],
      [
        story.narrativeText,
        story.summary,
        story.affectedDomain,
        story.city,
        story.aiImpactClassification,
        labelFromEnum(story.selfReportedImpact),
        story.transcriptionText,
      ],
      [
        story.brief?.summary,
      ],
    ]))
    .filter(Boolean)
    .sort((a, b) => sortRankedItems(a, b, (left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0)))
    .map(({ item }) => item);
}
