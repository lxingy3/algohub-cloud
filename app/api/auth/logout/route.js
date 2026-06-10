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
  response.cookies.delete('algohub_sso_role');
  response.cookies.delete('authjs.session-token');
  response.cookies.delete('__Secure-authjs.session-token');
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('__Secure-next-auth.session-token');
  return response;
}
