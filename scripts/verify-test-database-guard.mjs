import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { testDatabaseFingerprint } from '../lib/testDatabaseFingerprint.js';

const base = 'postgresql://user:password@localhost:5432/algohub-test?schema=public';
assert.equal(
  testDatabaseFingerprint(base),
  testDatabaseFingerprint('postgresql://other:secret@LOCALHOST:5432/algohub-test?schema=public'),
);
assert.notEqual(testDatabaseFingerprint(base), testDatabaseFingerprint(base.replace('algohub-test', 'algohub')));
assert.notEqual(testDatabaseFingerprint(base), testDatabaseFingerprint(base.replace('schema=public', 'schema=other')));

const guard = await readFile(new URL('./lib/require-test-database.mjs', import.meta.url), 'utf8');
assert.match(guard, /x-test-database-handshake/);
assert.match(guard, /payload\.fingerprint !== testDatabaseFingerprint\(testDatabaseUrl\)/);

for (const file of [
  'verify-auth-comment-moderation-lifecycle.mjs',
  'verify-briefing-partner-review-lifecycle.mjs',
  'verify-story-reaction-toggle.mjs',
]) {
  const source = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
  assert.match(source, /await requireTestDatabase\(/, `${file} must verify the server database before importing Prisma.`);
}

console.log('test database guard self-check PASS');
