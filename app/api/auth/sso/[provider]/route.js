import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const providers = new Set(['google', 'github', 'microsoft-entra-id']);

export async function GET(request, { params }) {
  const { provider } = await params;
  if (!providers.has(provider)) {
    return NextResponse.json({ error: 'Unsupported SSO provider.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const response = NextResponse.redirect(new URL(`/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url));

  response.cookies.set('algohub_sso_role', 'COMMUNITY_MEMBER', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
