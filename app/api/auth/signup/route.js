import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { sessionCookieName } from '../../../../lib/auth';
import { hashPassword, validatePassword } from '../../../../lib/password';

export const dynamic = 'force-dynamic';

const DEFAULT_ROLE = 'COMMUNITY_MEMBER';

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const name = String(formData.get('name') || '').trim() || email;
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const callbackUrl = safeCallbackUrl(formData.get('callbackUrl')) || '/';
  const jurisdictionId = getJurisdictionId();

  const passwordError = validatePassword(password);
  if (passwordError) {
    return redirectToSignup(request, callbackUrl, 'password-too-short');
  }

  if (password !== confirmPassword) {
    return redirectToSignup(request, callbackUrl, 'password-mismatch');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      jurisdictionId_email: {
        jurisdictionId,
        email,
      },
    },
  });

  if (existingUser) {
    const normalizedExistingName = existingUser.name.trim().toLowerCase();
    const normalizedSubmittedName = name.trim().toLowerCase();
    const error = normalizedExistingName === normalizedSubmittedName ? 'account-exists' : 'name-conflict';
    return redirectToSignup(request, callbackUrl, error);
  }

  const role = await prisma.role.upsert({
    where: { name: DEFAULT_ROLE },
    update: {},
    create: {
      name: DEFAULT_ROLE,
      description: 'community member account.',
    },
  });

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name,
        jurisdictionId,
        primaryRoleName: DEFAULT_ROLE,
        passwordHash: await hashPassword(password),
        passwordSetAt: new Date(),
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return redirectToSignup(request, callbackUrl, 'account-exists');
    }
    throw error;
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

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

function redirectToSignup(request, callbackUrl, error) {
  const url = new URL(callbackUrl, request.url);
  url.searchParams.set('authModal', 'signup');
  url.searchParams.set('signupError', error);
  return NextResponse.redirect(url, { status: 303 });
}
