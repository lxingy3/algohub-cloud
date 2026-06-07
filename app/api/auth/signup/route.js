import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { sessionCookieName } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const allowedRoles = new Set(['ADMIN', 'COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER']);

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const name = String(formData.get('name') || '').trim() || email;
  const requestedRole = String(formData.get('role') || 'COMMUNITY_MEMBER').trim().toUpperCase();
  const primaryRoleName = allowedRoles.has(requestedRole) ? requestedRole : 'COMMUNITY_MEMBER';
  const jurisdictionId = getJurisdictionId();

  const existingUser = await prisma.user.findUnique({
    where: {
      jurisdictionId_email_primaryRoleName: {
        jurisdictionId,
        email,
        primaryRoleName,
      },
    },
  });

  if (existingUser) {
    const normalizedExistingName = existingUser.name.trim().toLowerCase();
    const normalizedSubmittedName = name.trim().toLowerCase();
    const error = normalizedExistingName === normalizedSubmittedName ? 'account-exists' : 'name-conflict';
    return NextResponse.redirect(new URL(`/signup?error=${error}`, request.url), { status: 303 });
  }

  const role = await prisma.role.upsert({
    where: { name: primaryRoleName },
    update: {},
    create: {
      name: primaryRoleName,
      description: `${primaryRoleName.replaceAll('_', ' ').toLowerCase()} account.`,
    },
  });

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name,
        jurisdictionId,
        primaryRoleName,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.redirect(new URL('/signup?error=account-exists', request.url), { status: 303 });
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

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  response.cookies.set(sessionCookieName, session.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: session.expires,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
