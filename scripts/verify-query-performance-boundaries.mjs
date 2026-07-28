import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { rankAlgorithmsForSearch } from '../lib/searchRanking.js';
import { scanMissingMlCandidates } from '../lib/refreshMlScan.js';

const algorithmRoute = await readFile(new URL('../app/api/algorithms/route.js', import.meta.url), 'utf8');
const refreshRoute = await readFile(
  new URL('../app/api/admin/testimonies/refresh-ml/route.js', import.meta.url),
  'utf8',
);
const eventsRoute = await readFile(new URL('../app/api/events/route.js', import.meta.url), 'utf8');
const algorithmDetailRoute = await readFile(
  new URL('../app/api/algorithms/[slug]/route.js', import.meta.url),
  'utf8',
);
const algorithmDetailPage = await readFile(
  new URL('../app/algorithms/[slug]/page.js', import.meta.url),
  'utf8',
);
const briefingsClient = await readFile(
  new URL('../app/briefings/BriefingsClient.js', import.meta.url),
  'utf8',
);
const coverageRoute = await readFile(
  new URL('../app/api/explore/coverage/route.js', import.meta.url),
  'utf8',
);
const testimoniesRoute = await readFile(
  new URL('../app/api/testimonies/route.js', import.meta.url),
  'utf8',
);
const semanticEmbeddings = await readFile(
  new URL('../lib/semanticEmbeddings.js', import.meta.url),
  'utf8',
);
const adminTestimoniesRoute = await readFile(
  new URL('../app/api/admin/testimonies/route.js', import.meta.url),
  'utf8',
);
const crossJurisdictionRoute = await readFile(
  new URL('../app/api/explore/cross-jurisdiction/route.js', import.meta.url),
  'utf8',
);
const briefingsExplore = await readFile(
  new URL('../lib/briefingsExplore.js', import.meta.url),
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

const eventBriefingProjection = eventsRoute.match(/const briefingSelect = \{([\s\S]*?)\n\};/)?.[1] || '';
assert.match(eventsRoute, /searchParams\.get\('projection'\) === 'briefings'/);
assert.doesNotMatch(eventBriefingProjection, /imageUrl|description|organizer|_count/);
assert.match(eventBriefingProjection, /id:\s*true[\s\S]*title:\s*true[\s\S]*registrationUrl:\s*true/);
assert.match(eventsRoute, /select:\s*compact \? briefingSelect :/);
assert.match(eventsRoute, /imageUrl:\s*true[\s\S]*organizer:[\s\S]*_count:/);

const algorithmBriefingProjection = algorithmRoute.match(/const briefingSelect = \{([\s\S]*?)\n\};/)?.[1] || '';
assert.match(algorithmRoute, /searchParams\.get\('projection'\) === 'briefings'/);
assert.doesNotMatch(algorithmBriefingProjection, /storyboardSvg|description|purpose|dataUsed|_count/);
assert.match(algorithmBriefingProjection, /id:\s*true[\s\S]*slug:\s*true[\s\S]*name:\s*true[\s\S]*useCase:\s*true/);
assert.match(algorithmRoute, /compact\s*\?\s*\{\s*select:\s*briefingSelect\s*\}\s*:\s*\{\s*include:/);

assert.match(briefingsClient, /\/api\/events\?limit=6&projection=briefings/);
assert.equal(
  (briefingsClient.match(/\/api\/algorithms\?[^'`"]*projection=briefings/g) || []).length,
  2,
);

for (const source of [algorithmDetailRoute, algorithmDetailPage]) {
  const documentProjection = source.match(/documents:\s*\{[\s\S]*?select:\s*\{([\s\S]*?)\n\s*\},\n\s*\}/)?.[1] || '';
  assert.doesNotMatch(source, /documents:\s*true/);
  assert.match(documentProjection, /id:\s*true[\s\S]*title:\s*true[\s\S]*sourceType:\s*true[\s\S]*sourceUrl:\s*true/);
  assert.doesNotMatch(documentProjection, /rawText|tokenizedText|storageUrl/);
}

assert.doesNotMatch(coverageRoute, /getSemanticEmbeddingMap|includeExperiences:\s*true/);
assert.match(coverageRoute, /semanticEmbedding\.aggregate\([\s\S]*?_count:\s*\{\s*_all:\s*true\s*\}[\s\S]*?_max:\s*\{\s*generatedAt:\s*true\s*\}/);
assert.match(coverageRoute, /ai_extracted_experiences->'entities'/);

const excerptCandidateProjection = testimoniesRoute.match(/const testimonyExcerptCandidateSelect = \{([\s\S]*?)\n\};/)?.[1] || '';
assert.match(excerptCandidateProjection, /id:\s*true[\s\S]*aiThemes:\s*true[\s\S]*clusterId:\s*true[\s\S]*isOutlier:\s*true/);
assert.doesNotMatch(excerptCandidateProjection, /narrativeText|transcriptionText|aiExtractedExperiences|algorithmLinks/);
assert.match(testimoniesRoute, /take:\s*500[\s\S]*select:\s*testimonyExcerptCandidateSelect/);
assert.match(testimoniesRoute, /id:\s*\{\s*in:\s*selectedIds\s*\}[\s\S]*select:\s*testimonyExcerptSelect/);

const searchCandidateProjection = testimoniesRoute.match(/const testimonySearchCandidateSelect = \{([\s\S]*?)\n\};/)?.[1] || '';
assert.match(searchCandidateProjection, /narrativeText:\s*true[\s\S]*transcriptionText:\s*true/);
assert.doesNotMatch(searchCandidateProjection, /aiThemes|aiExtractedExperiences|algorithmLinks|_count/);
assert.match(testimoniesRoute, /searchTokens\(search\)\.slice\(0,\s*8\)/);
assert.match(testimoniesRoute, /\.trim\(\)\.slice\(0,\s*100\)/);
const searchBranch = testimoniesRoute.match(/if \(search\) \{([\s\S]*?)\n  \}\n\n  const \[items/)?.[1] || '';
assert.match(searchBranch, /select:\s*testimonySearchCandidateSelect/);
assert.doesNotMatch(searchBranch, /take:\s*500/);
assert.match(semanticEmbeddings, /select:\s*\{\s*entityId:\s*true,\s*vector:\s*true\s*\}/);
assert.doesNotMatch(semanticEmbeddings, /select:\s*\{[^}]*contentHash|select:\s*\{[^}]*generatedAt/);
assert.match(adminTestimoniesRoute, /Math\.min\(100,\s*Math\.max\(1,\s*requestedLimit\)\)/);
assert.match(adminTestimoniesRoute, /skip:\s*\(page - 1\) \* limit[\s\S]*take:\s*limit/);
assert.match(adminTestimoniesRoute, /prisma\.testimony\.count\(\{\s*where\s*\}\)/);
assert.doesNotMatch(adminTestimoniesRoute, /algorithm:\s*true/);
assert.match(crossJurisdictionRoute, /const \[insightEmbeddings, algorithmEmbeddings\] = algorithm\s*\?/);
assert.match(crossJurisdictionRoute, /:\s*\[new Map\(\), new Map\(\)\]/);
const landscapeSource = briefingsExplore.match(/export async function getAlgorithmLandscape[\s\S]*?\n\}/)?.[0] || '';
assert.match(landscapeSource, /_count:\s*\{[\s\S]*testimonyLinks:\s*\{\s*where:/);
assert.doesNotMatch(landscapeSource, /select:\s*\{\s*testimonyId:\s*true\s*\}/);

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
