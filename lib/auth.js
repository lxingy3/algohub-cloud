import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { auth } from './nextauth';
import { getJurisdictionId } from './jurisdiction';

export const sessionCookieName = 'algohub_session';

async function findUserWithRoles(where) {
  return prisma.user.findFirst({
    where,
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
}

async function getSsoUser(_cookieStore) {
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) return null;
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const jurisdictionId = getJurisdictionId();
  const provider = session.user.authProvider;
  const providerAccountId = session.user.providerAccountId;

  if (provider && providerAccountId) {
    const linkedAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: { role: true },
            },
          },
        },
      },
    });
    if (linkedAccount?.user?.jurisdictionId === jurisdictionId) return linkedAccount.user;
    if (linkedAccount) return null;
  }

  const existing = await findUserWithRoles({ email, jurisdictionId });
  if (existing) {
    await syncOAuthAccount(existing.id, provider, providerAccountId);
    return existing;
  }

  return null;
}

async function syncOAuthAccount(userId, provider, providerAccountId) {
  if (!provider || !providerAccountId) return;
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

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;
  if (!sessionToken) return getSsoUser(cookieStore);

  const session = await prisma.session.findUnique({
    where: {
      sessionToken,
    },
    include: {
      user: {
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      },
    },
  });

  if (!session || session.expires <= new Date()) return getSsoUser(cookieStore);
  return session.user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const isAdmin = user?.userRoles.some((userRole) => userRole.role.name === 'ADMIN');
  if (!isAdmin) return null;
  return user;
}
