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

  const role = await prisma.role.upsert({
    where: { name: primaryRoleName },
    update: {},
    create: {
      name: primaryRoleName,
      description: `${primaryRoleName.replaceAll('_', ' ').toLowerCase()} account.`,
    },
  });

  const user = await prisma.user.upsert({
    where: {
      jurisdictionId_email_primaryRoleName: {
        jurisdictionId,
        email,
        primaryRoleName,
      },
    },
    update: { name, primaryRoleName },
    create: {
      email,
      name,
      jurisdictionId,
      primaryRoleName,
    },
  });

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
