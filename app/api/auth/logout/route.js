import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sessionCookieName } from '../../../../lib/auth';

const knownCookieNames = [
  sessionCookieName,
  'algohub_sso_role',
  'algohub_sso_name',
  'algohub_auth_return_to',
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
];

function shouldClearCookie(name) {
  return (
    knownCookieNames.includes(name)
    || name.startsWith('authjs.')
    || name.startsWith('__Secure-authjs.')
    || name.startsWith('__Host-authjs.')
    || name.startsWith('next-auth.')
    || name.startsWith('__Secure-next-auth.')
    || name.startsWith('__Host-next-auth.')
  );
}

function expireCookie(response, name) {
  response.cookies.set(name, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

async function logout(request) {
  const sessionToken = request.cookies.get(sessionCookieName)?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  const cookieNames = new Set([
    ...knownCookieNames,
    ...request.cookies.getAll().map((cookie) => cookie.name).filter(shouldClearCookie),
  ]);

  for (const name of cookieNames) expireCookie(response, name);

  return response;
}

export async function POST(request) {
  return logout(request);
}

export async function GET(request) {
  return logout(request);
}
