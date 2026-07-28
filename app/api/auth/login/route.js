import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { sessionCookieName } from '../../../../lib/auth';
import { verifyPassword } from '../../../../lib/password';
import { safeInternalPath } from '../../../../lib/safeRedirect';
import { isSameOriginRequest } from '../../../../lib/requestSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-site login requests are not allowed.' }, { status: 403 });
  }

  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const callbackUrl = safeInternalPath(formData.get('callbackUrl'), '/');
  const user = await prisma.user.findFirst({
    where: { email, jurisdictionId: getJurisdictionId() },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return redirectToLogin(request, callbackUrl, 'invalid-credentials');
  }

  if (user.passwordHash) {
    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return redirectToLogin(request, callbackUrl, 'invalid-credentials');
    }
  } else if (password) {
    return redirectToLogin(request, callbackUrl, 'invalid-credentials');
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

function redirectToLogin(request, callbackUrl, error) {
  const url = new URL(callbackUrl, request.url);
  url.searchParams.set('authModal', 'login');
  url.searchParams.set('authError', error);
  return NextResponse.redirect(url, { status: 303 });
}
