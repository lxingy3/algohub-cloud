import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getApprovedBriefingCorpus } from '../lib/briefingsExplore.js';
import { prisma } from '../lib/prisma.js';

const originalFindMany = prisma.testimony.findMany;
const queries = [];
prisma.testimony.findMany = async (query) => {
  queries.push(query);
  return [];
};

try {
  await getApprovedBriefingCorpus();
  await getApprovedBriefingCorpus({}, { includeExperiences: true });
  await getApprovedBriefingCorpus({}, { includeExcerpts: true });
} finally {
  prisma.testimony.findMany = originalFindMany;
}

assert.equal(queries.length, 3);
assert.equal(queries[0].select.narrativeText, undefined);
assert.equal(queries[0].select.transcriptionText, undefined);
assert.equal(queries[0].select.aiExtractedExperiences, undefined);
assert.equal(queries[1].select.aiExtractedExperiences, true);
assert.equal(queries[1].select.narrativeText, undefined);
assert.equal(queries[2].select.narrativeText, true);
assert.equal(queries[2].select.transcriptionText, true);
assert.equal(queries[2].select.aiExtractedExperiences, true);

for (const route of ['claim-vs-experience', 'patterns', 'recognition']) {
  const source = await readFile(new URL(`../app/api/explore/${route}/route.js`, import.meta.url), 'utf8');
  assert.match(source, /includeExcerpts: filters\.lens !== 'government'/, `${route} must not read story text for the government lens.`);
}

console.log('briefings explore query self-check PASS');
