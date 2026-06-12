import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { sessionCookieName } from '../../../../lib/auth';
import { normalizeRole } from '../../../../lib/roles';
import { allowLegacyEmptyPasswordLogin, verifyPassword } from '../../../../lib/password';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const primaryRoleName = normalizeRole(formData.get('role'));
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl')) || '/';
  const user = await prisma.user.findFirst({
    where: { email, jurisdictionId: getJurisdictionId(), primaryRoleName },
  });

  if (!user) {
    return redirectToLogin(request, callbackUrl, 'not-found');
  }

  if (user.passwordHash) {
    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return redirectToLogin(request, callbackUrl, 'invalid-password');
    }
  } else if (password || !allowLegacyEmptyPasswordLogin()) {
    return redirectToLogin(request, callbackUrl, 'password-not-set');
  }

  const session = await prisma.session.create({
    data: {
      sessionToken: randomUUID(),
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const response = NextResponse.redirect(new URL(callbackUrl, request.url), { status: 303 });
  response.cookies.set(sessionCookieName, session.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: session.expires,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

function safeCallbackUrl(value) {
  const callbackUrl = String(value || '');
  if (!callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return null;
  return callbackUrl;
}

function redirectToLogin(request, callbackUrl, error) {
  const url = new URL(callbackUrl, request.url);
  url.searchParams.set('authModal', 'login');
  url.searchParams.set('authError', error);
  return NextResponse.redirect(url, { status: 303 });
}
