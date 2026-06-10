import { LoginModal } from '../components/LoginModal';
import { getEnabledSsoProviders } from '../../lib/ssoProviders';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-100">
      <LoginModal forceOpen open error={Boolean(params?.error)} enabledSsoProviders={getEnabledSsoProviders()} />
    </main>
  );
}
