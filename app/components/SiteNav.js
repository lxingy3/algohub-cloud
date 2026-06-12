import { SiteNavClient } from './SiteNavClient';

export function SiteNav({ currentUser }) {
  const isAdmin = Boolean(currentUser?.userRoles?.some((userRole) => userRole.role.name === 'ADMIN'));
  return (
    <SiteNavClient
      isLoggedIn={Boolean(currentUser)}
      isAdmin={isAdmin}
      currentUserId={currentUser?.id || ''}
      needsPasswordSetup={Boolean(currentUser && !currentUser.passwordHash)}
    />
  );
}
