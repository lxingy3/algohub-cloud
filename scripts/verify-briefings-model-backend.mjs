import assert from 'node:assert/strict';

const baseUrl = (process.argv[2] || process.env.BRIEFINGS_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');

async function get(path) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.ok, true, `${path} returned ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

const impact = await get('/api/explore/impact?scope=corpus');
const themes = await get('/api/explore/cross-cutting-themes?scope=corpus');
const patterns = await get('/api/explore/patterns?scope=corpus');
const silence = await get('/api/explore/silence?scope=corpus&lens=intermediary');
const recognition = await get('/api/explore/recognition?scope=corpus&theme=data_accuracy');
const claims = await get('/api/explore/claim-vs-experience?scope=corpus&lens=government');
const governmentStories = await get('/api/testimonies?fields=excerpt&scope=corpus&lens=government');
const governmentPatterns = await get('/api/explore/patterns?scope=corpus&lens=government');
const communityStories = await get('/api/testimonies?fields=excerpt&scope=corpus&lens=community&limit=50');

assert.match(impact.method, /BART-MNLI/);
assert.equal(impact.reviewThreshold, 0.85);
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
assert.match(recognition.method, /sentence-transformers cosine/);
assert.equal(recognition.cachedEmbeddingCoverage.model, 'Qwen/Qwen3-Embedding-0.6B');
assert.match(claims.method, /sentence-transformers cosine/);
assert.ok(claims.rows.every((row) => !('experienceExamples' in row) || row.experienceExamples.length === 0));
assert.equal(governmentStories.items.length, 0);
assert.match(governmentStories.notes.join(' '), /aggregate-only/);
assert.equal(governmentPatterns.points.length, 0);
assert.match(governmentPatterns.notes.join(' '), /aggregate-only/);
assert.ok(communityStories.items.length > 0);
assert.ok(communityStories.items.every((row) => !('narrativeText' in row) && typeof row.excerpt === 'string'));
assert.ok(communityStories.items.some((row) => row.excerpt.includes('[locations]')));
assert.ok(communityStories.items.every((row) => Array.isArray(row.keywords) && row.cluster));

console.log(JSON.stringify({
  baseUrl,
  stories: patterns.total,
  topics: patterns.topics.length,
  outliers: patterns.points.filter((row) => row.isOutlier).length,
  silenceRows: silence.rows.length,
  claimRows: claims.rows.length,
  status: 'PASS',
}, null, 2));
