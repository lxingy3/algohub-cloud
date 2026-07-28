import { createHash } from 'node:crypto';

export function testDatabaseFingerprint(databaseUrl) {
  const parsed = new URL(String(databaseUrl || ''));
  const identity = JSON.stringify({
    protocol: parsed.protocol,
    hostname: parsed.hostname.toLowerCase(),
    port: parsed.port,
    database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
    schema: parsed.searchParams.get('schema') || 'public',
  });
  return createHash('sha256').update(identity).digest('hex');
}
