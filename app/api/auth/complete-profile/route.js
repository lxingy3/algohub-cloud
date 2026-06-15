import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/nextauth';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

const DEFAULT_ROLE = 'COMMUNITY_MEMBER';

export async function POST(request) {
  const formData = await request.formData();
  const returnTo = safeReturnTo(formData.get('returnTo')) || '/';
  const name = String(formData.get('name') || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const provider = session?.user?.authProvider;
  const providerAccountId = session?.user?.providerAccountId;

  if (!email || !provider || !providerAccountId) {
    return redirectToSetup(request, returnTo, 'auth-required');
  }

  if (name.length < 2) {
    return redirectToSetup(request, returnTo, 'name-required');
  }

  const jurisdictionId = getJurisdictionId();

  const linkedAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: { user: true },
  });

  if (linkedAccount?.user?.jurisdictionId === jurisdictionId) {
    return redirectWithClearedSetupCookies(request, returnTo);
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
    await syncOAuthAccount(existingUser.id, provider, providerAccountId);
    return redirectWithClearedSetupCookies(request, returnTo);
  }

  const role = await prisma.role.upsert({
    where: { name: DEFAULT_ROLE },
    update: {},
    create: {
      name: DEFAULT_ROLE,
      description: 'community member account.',
    },
  });

  const user = await prisma.user.create({
    data: {
      jurisdictionId,
      email,
      primaryRoleName: DEFAULT_ROLE,
      emailVerified: new Date(),
      name,
      image: session.user.image || null,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  await syncOAuthAccount(user.id, provider, providerAccountId);

  return redirectWithClearedSetupCookies(request, returnTo);
}

async function syncOAuthAccount(userId, provider, providerAccountId) {
  await prisma.account.deleteMany({
    where: {
      userId,
      provider,
      providerAccountId: { not: providerAccountId },
    },
  });
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    update: { userId },
    create: {
      userId,
      provider,
      providerAccountId,
      type: 'oauth',
    },
  });
}

function redirectToSetup(request, returnTo, error) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set('authModal', 'complete-profile');
  url.searchParams.set('profileError', error);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectWithClearedSetupCookies(request, returnTo) {
  const response = NextResponse.redirect(new URL(returnTo, request.url), { status: 303 });
  for (const name of ['algohub_sso_role', 'algohub_sso_name', 'algohub_auth_return_to']) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
}

function safeReturnTo(value) {
  const returnTo = String(value || '');
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  if (returnTo.startsWith('/auth/complete-profile')) return '/';
  return returnTo;
}
