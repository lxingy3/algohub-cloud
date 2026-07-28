import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/nextauth';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { safeInternalPath } from '../../../../lib/safeRedirect';

export const dynamic = 'force-dynamic';

const DEFAULT_ROLE = 'COMMUNITY_MEMBER';

export async function POST(request) {
  const formData = await request.formData();
  const returnTo = safeReturnTo(formData.get('returnTo'));
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
  if (linkedAccount) {
    return redirectToSetup(request, returnTo, 'account-exists');
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
    return redirectToSetup(request, returnTo, 'account-exists');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({
        where: { name: DEFAULT_ROLE },
        update: {},
        create: {
          name: DEFAULT_ROLE,
          description: 'community member account.',
        },
      });
      const user = await tx.user.create({
        data: {
          jurisdictionId,
          email,
          primaryRoleName: DEFAULT_ROLE,
          emailVerified: new Date(),
          name,
          image: session.user.image || null,
        },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      await tx.account.create({
        data: {
          userId: user.id,
          provider,
          providerAccountId,
          type: 'oauth',
        },
      });
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return redirectToSetup(request, returnTo, 'account-exists');
    }
    throw error;
  }

  return redirectWithClearedSetupCookies(request, returnTo);
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
  const returnTo = safeInternalPath(value, '/');
  if (returnTo.startsWith('/auth/complete-profile')) return '/';
  return returnTo;
}
