import { testDatabaseFingerprint } from '../../lib/testDatabaseFingerprint.js';

export async function requireTestDatabase(scriptName, baseUrl = 'http://127.0.0.1:3000') {
  const testDatabaseUrl = String(process.env.TEST_DATABASE_URL || '').trim();
  if (!testDatabaseUrl) {
    throw new Error(
      `${scriptName} mutates data and requires TEST_DATABASE_URL. `
      + 'It will not fall back to DATABASE_URL.',
    );
  }
  if (process.env.ALLOW_TEST_WRITES !== '1') {
    throw new Error(`${scriptName} requires ALLOW_TEST_WRITES=1 in addition to TEST_DATABASE_URL.`);
  }

  let parsedDatabaseUrl;
  try {
    parsedDatabaseUrl = new URL(testDatabaseUrl);
  } catch {
    throw new Error(`${scriptName} received an invalid TEST_DATABASE_URL.`);
  }
  const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\/+/, ''));
  if (!/(^test$|(?:^|[-_])test$)/i.test(databaseName)) {
    throw new Error(`${scriptName} requires a database name ending in "-test" or "_test".`);
  }
  if (/\.neon\.tech$/i.test(parsedDatabaseUrl.hostname) && process.env.ALLOW_REMOTE_LIFECYCLE_TESTS !== '1') {
    throw new Error(`${scriptName} refuses Neon by default. Use an isolated local test database.`);
  }
  if (
    !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(baseUrl)
    && process.env.ALLOW_REMOTE_LIFECYCLE_TESTS !== '1'
  ) {
    throw new Error(
      `${scriptName} only targets a local app by default. `
      + 'Set ALLOW_REMOTE_LIFECYCLE_TESTS=1 only for an isolated staging app backed by TEST_DATABASE_URL.',
    );
  }
  process.env.DATABASE_URL = testDatabaseUrl;

  const handshakeSecret = String(process.env.TEST_DATABASE_HANDSHAKE_SECRET || '');
  if (handshakeSecret.length < 24) {
    throw new Error(`${scriptName} requires TEST_DATABASE_HANDSHAKE_SECRET with at least 24 characters.`);
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/api/test-support/database-fingerprint`, {
      headers: { 'x-test-database-handshake': handshakeSecret },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(`${scriptName} could not verify the app test database: ${error.message}`);
  }
  const payload = response.ok ? await response.json().catch(() => ({})) : {};
  if (payload.fingerprint !== testDatabaseFingerprint(testDatabaseUrl)) {
    throw new Error(
      `${scriptName} refused to run because the app server is not proven to use TEST_DATABASE_URL. `
      + 'Start it with DATABASE_URL=TEST_DATABASE_URL, ENABLE_TEST_DATABASE_HANDSHAKE=1, '
      + 'and the same TEST_DATABASE_HANDSHAKE_SECRET.',
    );
  }
}
