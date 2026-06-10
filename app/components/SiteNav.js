import { SiteNavClient } from './SiteNavClient';
import { getEnabledSsoProviders } from '../../lib/ssoProviders';

export function SiteNav({ currentUser }) {
  return <SiteNavClient isLoggedIn={Boolean(currentUser)} enabledSsoProviders={getEnabledSsoProviders()} />;
}
