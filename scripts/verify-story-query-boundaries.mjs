import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const listSource = await readFile(new URL('../app/stories/page.js', import.meta.url), 'utf8');
const detailSource = await readFile(new URL('../app/stories/[id]/page.js', import.meta.url), 'utf8');

assert.match(listSource, /skip: \(pageNumber - 1\) \* pageSize,\s+take: pageSize,/);
assert.match(listSource, /if \(pageNumber > totalPages\) redirect\(/);
assert.doesNotMatch(listSource, /rankStoriesForSearch/);
assert.match(listSource, /import \{ searchTokens \} from '\.\.\/\.\.\/lib\/searchRanking';/);
assert.match(listSource, /searchTokens\(search\)\.slice\(0, 8\)\.map\(\(token\) => \(\{\s+OR:/);
assert.match(listSource, /\.\.\.\(searchFilters\.length \? \{ AND: searchFilters \} : \{\}\)/);
assert.doesNotMatch(listSource, /contains: search/);
assert.doesNotMatch(
  listSource.match(/prisma\.testimony\.findMany\(\{[\s\S]*?\n    \}\),\n    prisma\.testimony\.groupBy/)?.[0] || '',
  /(narrativeText|transcriptionText): true/,
);
assert.match(listSource, /prisma\.testimony\.groupBy\(\{/);
assert.match(listSource, /comments: \{ where: \{ moderationStatus: 'APPROVED', parentCommentId: null \} \}/);

assert.match(detailSource, /prisma\.testimonyReaction\.groupBy\(\{/);
assert.match(detailSource, /_count: \{ _all: true \}/);
assert.match(detailSource, /where: \{ userId: user\.id \}, take: 1, select: \{ id: true \}/);
assert.match(detailSource, /_count: \{ select: \{ likes: true \} \}/);
assert.doesNotMatch(detailSource, /userId: true/);
assert.doesNotMatch(detailSource, /reactionType: true, userId: true/);

console.log('Story query boundary self-check passed.');
