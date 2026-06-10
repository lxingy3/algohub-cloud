import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { auth } from './nextauth';
import { normalizeRole } from './roles';
import { getJurisdictionId } from './jurisdiction';

export const sessionCookieName = 'algohub_session';

async function ensureRole(name) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: {
      name,
      description: `${name.replaceAll('_', ' ').toLowerCase()} account.`,
    },
  });
}

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

async function getSsoUser(cookieStore) {
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) return null;
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  const jurisdictionId = getJurisdictionId();
  const requestedRole = normalizeRole(cookieStore.get('algohub_sso_role')?.value);
  const displayName = cookieStore.get('algohub_sso_name')?.value?.trim() || session.user.name || email;
  const existing = await findUserWithRoles({ email, jurisdictionId, primaryRoleName: requestedRole });
  if (existing) return existing;

  const anyExistingRole = await findUserWithRoles({ email, jurisdictionId });
  if (anyExistingRole) return anyExistingRole;

  if (requestedRole !== 'COMMUNITY_MEMBER') return null;

  const role = await ensureRole('COMMUNITY_MEMBER');
  const user = await prisma.user.upsert({
    where: {
      jurisdictionId_email_primaryRoleName: {
        jurisdictionId,
        email,
        primaryRoleName: 'COMMUNITY_MEMBER',
      },
    },
    update: {
      name: displayName,
      image: session.user.image || null,
    },
    create: {
      jurisdictionId,
      email,
      primaryRoleName: 'COMMUNITY_MEMBER',
      name: displayName,
      image: session.user.image || null,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return findUserWithRoles({ id: user.id });
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
