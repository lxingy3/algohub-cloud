import Link from 'next/link';
import { PenLine, ShieldCheck } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';

export const dynamic = 'force-dynamic';

export default async function SubmitTestimonyPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[.85fr_1.15fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <PenLine className="h-8 w-8 text-amber-600" />
          <h1 className="mt-4 text-3xl font-black">Share your story</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Submitted testimony is saved to the database and starts in the pending moderation queue before it appears publicly.
          </p>
          <div className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              Review first
            </div>
            <p className="mt-2">
              {user ? `Submitting as ${user.email}.` : 'You can submit without logging in, but logging in links the testimony to your account.'}
            </p>
          </div>
          <Link href="/stories" className="mt-6 inline-block text-sm font-semibold text-amber-800 hover:text-amber-950">
            Read public stories
          </Link>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <form action="/api/testimonies" method="post" className="space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              Short title
              <input name="title" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-950" required />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              City
              <input name="city" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-950" />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Related algorithm
              <select name="algorithmId" defaultValue={params?.algorithmId || ''} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-950">
                <option value="">Not sure / not listed</option>
                {algorithms.map((algorithm) => (
                  <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Impact
              <select name="selfReportedImpact" defaultValue="UNCLEAR" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-950">
                <option value="NEGATIVE">Negative</option>
                <option value="MIXED">Mixed</option>
                <option value="POSITIVE">Positive</option>
                <option value="UNCLEAR">Unclear</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Story
              <textarea name="narrativeText" className="mt-1 min-h-48 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-950" required />
            </label>
            <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Submit testimony
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
