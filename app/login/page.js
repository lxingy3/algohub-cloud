import { LoginModal } from '../components/LoginModal';
import { getCurrentUser } from '../../lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const forceLogin = params?.switch === '1' || params?.force === '1';

  if (user && !forceLogin) redirect('/');

  return (
    <main className="min-h-screen bg-slate-100">
      <LoginModal
        forceOpen
        open
        error={Boolean(params?.error)}
        initialRole={params?.role}
        initialCallbackUrl={params?.callbackUrl}
      />
    </main>
  );
}
