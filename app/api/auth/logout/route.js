import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sessionCookieName } from '../../../../lib/auth';

export async function POST(request) {
  const sessionToken = request.cookies.get(sessionCookieName)?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  response.cookies.delete(sessionCookieName);
  return response;
}
