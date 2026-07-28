import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { rankAlgorithmsForSearch } from '../lib/searchRanking.js';
import { scanMissingMlCandidates } from '../lib/refreshMlScan.js';

const algorithmRoute = await readFile(new URL('../app/api/algorithms/route.js', import.meta.url), 'utf8');
const refreshRoute = await readFile(
  new URL('../app/api/admin/testimonies/refresh-ml/route.js', import.meta.url),
  'utf8',
);

assert.doesNotMatch(algorithmRoute, /tokenizedText/);
assert.doesNotMatch(algorithmRoute, /rawText:\s*true/);
assert.doesNotMatch(algorithmRoute, /narrativeText:\s*true/);
assert.match(algorithmRoute, /algorithmDocument\.findMany[\s\S]*?select:\s*\{\s*algorithmId:\s*true\s*\}/);
assert.match(algorithmRoute, /testimonyAlgorithmLink\.findMany[\s\S]*?select:\s*\{\s*algorithmId:\s*true\s*\}/);
assert.doesNotMatch(algorithmRoute, /Promise\.all\(tokens\.map/);
assert.match(algorithmRoute, /AND:\s*tokens\.map/);
assert.match(algorithmRoute, /addFullTextMatchMarkers\(candidates,\s*searchTokens\(search\)\.slice\(0, 8\)\)/);
assert.match(algorithmRoute, /\.trim\(\)\.slice\(0, 100\)/);
assert.match(algorithmRoute, /Number\.isFinite\(requestedLimit\)/);

const markerRank = rankAlgorithmsForSearch([
  { id: 'document-match', name: 'Alpha', documents: [{ rawText: 'tenant' }] },
  { id: 'no-match', name: 'Beta', documents: [] },
], 'tenant');
assert.deepEqual(markerRank.map(({ id }) => id), ['document-match']);

const statusProjection = refreshRoute.match(/const statusSelect = \{([\s\S]*?)\n\};/)?.[1] || '';
assert.doesNotMatch(statusProjection, /narrativeText|transcriptionText|summary|algorithmLinks/);
assert.match(refreshRoute, /const scanLimit = 100/);
assert.match(refreshRoute, /scanMissingMlCandidates\(/);
assert.match(refreshRoute, /pageSize:\s*scanLimit/);
assert.match(refreshRoute, /cursor:\s*\{\s*id:\s*cursor\s*\}/);
assert.match(refreshRoute, /isMissingTask2To5\(testimony\)/);
assert.match(refreshRoute, /!isStoredAlgorithmMatchComplete\(testimony,\s*algorithmCatalogVersion\)/);
assert.match(refreshRoute, /const chunkIds = candidateIds\.slice\(offset,\s*offset \+ remaining\)/);
assert.match(refreshRoute, /id:\s*\{\s*in:\s*chunkIds\s*\}[\s\S]*?select:\s*candidateSelect/);
assert.match(refreshRoute, /take:\s*ids\.length \|\| limit/);
assert.match(refreshRoute, /\.slice\(0, 100\)/);
assert.match(refreshRoute, /Number\.isFinite\(requestedLimit\)/);
assert.doesNotMatch(refreshRoute, /body\.cursor|nextCursor/);

const rows = Array.from({ length: 101 }, (_, index) => ({ id: String(index + 1), missing: index === 100 }));
const collected = [];
const scanned = await scanMissingMlCandidates({
  pageSize: 100,
  shouldStop: () => collected.length > 0,
  isMissing: (row) => row.missing,
  fetchPage: async ({ cursor, take }) => {
    const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
    return rows.slice(start, start + take);
  },
  onCandidates: async (ids) => collected.push(...ids),
});
assert.deepEqual(collected, ['101']);
assert.equal(scanned, 101);

console.log('query performance boundary self-check PASS');
