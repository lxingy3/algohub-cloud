import { NextResponse } from 'next/server';
import { safeInternalPath } from '../../../../lib/safeRedirect';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const role = 'COMMUNITY_MEMBER';
  const returnTo = safeInternalPath(body.returnTo, '/');
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set('algohub_sso_role', role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set('algohub_auth_return_to', returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  });

  response.cookies.set('algohub_sso_name', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
