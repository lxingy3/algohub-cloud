import assert from 'node:assert/strict';

const baseUrl = (process.argv[2] || process.env.BRIEFINGS_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');

async function get(path) {
  const startedAt = Date.now();
  console.log(`check ${path}`);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.ok, true, `${path} returned ${response.status}`);
      const result = await response.json();
      console.log(`ok ${path} ${Date.now() - startedAt}ms`);
      return result;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

async function getAll(paths) {
  const results = [];
  for (const path of paths) results.push(await get(path));
  return results;
}

const [
  impact,
  themes,
  patterns,
  silence,
  recognition,
  claims,
  intermediaryClaims,
  governmentStories,
  governmentPatterns,
  communityStories,
  filteredThemes,
  filteredPatterns,
  filteredLandscape,
  filteredStories,
  coverage,
  comparison,
] = await getAll([
  '/api/explore/impact?scope=corpus',
  '/api/explore/cross-cutting-themes?scope=corpus',
  '/api/explore/patterns?scope=corpus',
  '/api/explore/silence?scope=corpus&lens=intermediary',
  '/api/explore/recognition?scope=corpus&theme=data_accuracy',
  '/api/explore/claim-vs-experience?scope=corpus&lens=government',
  '/api/explore/claim-vs-experience?scope=corpus&lens=intermediary',
  '/api/testimonies?fields=excerpt&scope=corpus&lens=government',
  '/api/explore/patterns?scope=corpus&lens=government',
  '/api/testimonies?fields=excerpt&scope=corpus&lens=community&limit=200',
  '/api/explore/cross-cutting-themes?scope=corpus&theme=data_accuracy',
  '/api/explore/patterns?scope=corpus&domain=Housing',
  '/api/explore/landscape?scope=corpus&theme=data_accuracy',
  '/api/testimonies?fields=excerpt&scope=corpus&theme=data_accuracy&limit=200',
  '/api/explore/coverage?scope=corpus&lens=intermediary',
  '/api/explore/compare?scope=corpus&dimension=agency&lens=intermediary',
]);

assert.match(impact.method, /stored impact labels/);
assert.doesNotMatch(impact.method, /BART-MNLI/);
assert.equal(impact.reviewThreshold, 0.85);
assert.match(themes.method, /stored multi-label themes/);
assert.match(themes.method, /above 0\.5/);
assert.ok(themes.themes.every((row) => row.label === 'suggested'));
assert.match(patterns.method, /UMAP.*HDBSCAN.*BERTopic.*KeyBERT/);
assert.equal(patterns.points.length, patterns.total);
assert.ok(patterns.points.every((row) => Number.isFinite(row.umapX) && Number.isFinite(row.umapY)));
assert.ok(patterns.topics.every((row) => row.label && Array.isArray(row.topKeywords)));
assert.match(silence.method, /four-factor silence detector/);
for (const row of silence.rows) {
  const expected = Math.min(1, row.factors.impactWeight * (
    0.4 * row.factors.volumeGap + 0.3 * row.factors.semanticGap + 0.3 * row.factors.domainGap
  ));
  assert.ok(Math.abs(row.silenceScore - expected) <= 0.02, `${row.algorithmName} silence score drifted`);
  assert.ok(Array.isArray(row.possibleReasons) && row.possibleReasons.length > 0, `${row.algorithmName} has no silence reason`);
}
assert.match(recognition.method, /sentence-transformers.*cosine/);
assert.equal(recognition.cachedEmbeddingCoverage.model, 'Qwen/Qwen3-Embedding-0.6B');
assert.match(claims.method, /sentence-transformers.*cosine/);
assert.ok(claims.rows.every((row) => !('experienceExamples' in row) || row.experienceExamples.length === 0));
const afstClaims = intermediaryClaims.rows.find((row) => row.algorithmSlug === 'allegheny-family-screening-tool');
assert.ok(afstClaims?.experienceExamples?.length > 0);
assert.ok(afstClaims.experienceExamples.every((row) => row.affectedDomain === 'Child Welfare'), 'AFST claim retrieval crossed an unrelated domain');
assert.equal(governmentStories.items.length, 0);
assert.match(governmentStories.notes.join(' '), /aggregate-only/);
assert.equal(governmentPatterns.points.length, 0);
assert.match(governmentPatterns.notes.join(' '), /aggregate-only/);
assert.ok(communityStories.items.length > 0);
assert.equal(communityStories.items.length, communityStories.total, 'Briefings excerpt snapshot is incomplete');
assert.ok(communityStories.items.every((row) => !('narrativeText' in row) && typeof row.excerpt === 'string'));
assert.ok(communityStories.items.some((row) => row.excerpt.includes('[locations]')));
assert.ok(communityStories.items.every((row) => Array.isArray(row.keywords) && row.cluster));
assert.ok(communityStories.items.some((row) => /cluster centroid/.test(row.whyShown)), 'representative excerpts are not centroid-selected');
assert.ok(communityStories.items.some((row) => /outlier/.test(row.whyShown)), 'outlier excerpt is missing');
assert.ok(filteredThemes.totalStories > 0 && filteredThemes.totalStories < themes.totalStories, 'theme facet did not narrow the corpus');
const filteredTopicCounts = new Map();
for (const point of filteredPatterns.points) {
  if (point.topicId !== null) filteredTopicCounts.set(point.topicId, (filteredTopicCounts.get(point.topicId) || 0) + 1);
}
assert.ok(filteredPatterns.topics.every((topic) => topic.size === filteredTopicCounts.get(topic.topicId)), 'filtered topic size does not match its returned points');
for (const algorithm of filteredLandscape.algorithms) {
  const expected = filteredStories.items.filter((story) => story.algorithms.some((item) => item.slug === algorithm.slug)).length;
  assert.equal(algorithm.approvedTestimonyCount, expected, `${algorithm.name} filtered story count drifted`);
}
assert.equal(coverage.processingCoverage.totalApprovedStories, coverage.total);
for (const key of ['impactClassified', 'themesAssigned', 'summariesAvailable', 'entitiesExtracted', 'perTestimonyProcessed', 'corpusMapped', 'topicAssigned', 'outliers', 'semanticEmbeddings']) {
  assert.ok(coverage.processingCoverage[key] >= 0 && coverage.processingCoverage[key] <= coverage.total, `${key} processing count is invalid`);
}
assert.ok(comparison.groups.every((group) => Array.isArray(group.themes) && (group.averageSilenceScore === null || Number.isFinite(group.averageSilenceScore))));
assert.ok(governmentPatterns.topics.every((topic) => topic.size >= 5), 'government topic aggregates fell below the privacy threshold');

console.log(JSON.stringify({
  baseUrl,
  stories: patterns.total,
  topics: patterns.topics.length,
  outliers: patterns.points.filter((row) => row.isOutlier).length,
  silenceRows: silence.rows.length,
  claimRows: claims.rows.length,
  themeFilteredStories: filteredThemes.totalStories,
  filteredPatternPoints: filteredPatterns.points.length,
  status: 'PASS',
}, null, 2));
