import { cookies } from 'next/headers';
import { prisma } from './prisma';

export const sessionCookieName = 'algohub_session';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;
  if (!sessionToken) return null;

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

  if (!session || session.expires <= new Date()) return null;
  return session.user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const isAdmin = user?.userRoles.some((userRole) => userRole.role.name === 'ADMIN');
  if (!isAdmin) return null;
  return user;
}
