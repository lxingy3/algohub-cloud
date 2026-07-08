import { SiteNav } from '../components/SiteNav';
import { getCurrentUser } from '../../lib/auth';
import { BriefingsClient } from './BriefingsClient';

export default async function BriefingsPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <BriefingsClient />
    </main>
  );
}
