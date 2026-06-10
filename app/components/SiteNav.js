import { SiteNavClient } from './SiteNavClient';

export function SiteNav({ currentUser }) {
  return <SiteNavClient isLoggedIn={Boolean(currentUser)} />;
}
