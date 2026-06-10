import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { sessionCookieName } from '../../../../lib/auth';
import { normalizeRole } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const primaryRoleName = normalizeRole(formData.get('role'));
  const user = await prisma.user.findFirst({
    where: { email, jurisdictionId: getJurisdictionId(), primaryRoleName },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=not-found', request.url), { status: 303 });
  }

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
