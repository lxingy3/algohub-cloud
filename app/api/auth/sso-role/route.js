import { NextResponse } from 'next/server';
import { normalizeRole } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const role = normalizeRole(body.role);
  const displayName = String(body.displayName || '').trim().slice(0, 120);
  const returnTo = safeReturnTo(body.returnTo) || '/';
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

  if (displayName) {
    response.cookies.set('algohub_sso_name', displayName, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    response.cookies.set('algohub_sso_name', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

function safeReturnTo(value) {
  const returnTo = String(value || '');
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  return returnTo;
}
