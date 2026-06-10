import { LoginModal } from '../components/LoginModal';
import { getCurrentUser } from '../../lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) redirect('/');

  return (
    <main className="min-h-screen bg-slate-100">
      <LoginModal forceOpen open error={Boolean(params?.error)} />
    </main>
  );
}
