import { SiteNavClient } from './SiteNavClient';
import { auth } from '../../lib/nextauth';

export async function SiteNav({ currentUser }) {
  const isAdmin = Boolean(currentUser?.userRoles?.some((userRole) => userRole.role.name === 'ADMIN'));
  const ssoSession = currentUser ? null : await auth();
  const pendingSsoEmail = ssoSession?.user?.email?.trim().toLowerCase() || '';

  return (
    <SiteNavClient
      isLoggedIn={Boolean(currentUser)}
      isAdmin={isAdmin}
      currentUserId={currentUser?.id || ''}
      needsPasswordSetup={Boolean(currentUser && !currentUser.passwordHash)}
      pendingSsoEmail={pendingSsoEmail}
    />
  );
}
