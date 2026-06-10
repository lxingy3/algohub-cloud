import { NextResponse } from 'next/server';
import { normalizeRole } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const role = normalizeRole(body.role);
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set('algohub_sso_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
