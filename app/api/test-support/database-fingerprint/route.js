import { NextResponse } from 'next/server';
import { testDatabaseFingerprint } from '../../../../lib/testDatabaseFingerprint';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const configuredSecret = String(process.env.TEST_DATABASE_HANDSHAKE_SECRET || '');
  if (
    process.env.NODE_ENV === 'production'
    || process.env.ENABLE_TEST_DATABASE_HANDSHAKE !== '1'
    || configuredSecret.length < 24
    || request.headers.get('x-test-database-handshake') !== configuredSecret
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(
    { fingerprint: testDatabaseFingerprint(process.env.DATABASE_URL) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
