import { SiteNav } from '../components/SiteNav';
import { BriefingsClient } from './BriefingsClient';

export default async function BriefingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteNav currentUser={null} disableSsoCheck />
      <BriefingsClient />
    </main>
  );
}
