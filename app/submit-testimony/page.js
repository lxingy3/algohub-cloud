import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { PenLine, Send, Shield } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { SubmitButton } from '../components/SubmitButton';

export const dynamic = 'force-dynamic';

export default async function SubmitTestimonyPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const idempotencyKey = randomUUID();
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-3xl px-6 py-12">
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <PenLine className="h-8 w-8 text-yellow-300" />
            Share Your Story
          </h1>
          <p className="text-yellow-100/80">Help us understand how algorithms affect people in public services.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <form action="/api/testimonies" method="post" className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">What Happened?</h2>
            <label className="block text-sm font-medium text-gray-700">
              Select an algorithm related to your experience
              <select name="algorithmId" defaultValue={params?.algorithmId || ''} className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2">
                <option value="">Not sure / not listed</option>
                {algorithms.map((algorithm) => (
                  <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Short title
              <input name="title" className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2" required />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">Tell us your story</h2>
            <label className="block text-sm font-medium text-gray-700">
              Share your experience
              <textarea name="narrativeText" rows={8} className="mt-2 w-full resize-none rounded-md border border-gray-200 px-3 py-2" required />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">About You</h2>
            <label className="block text-sm font-medium text-gray-700">
              City
              <input name="city" placeholder="e.g. Pittsburgh, Philadelphia" className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Impact
              <select name="selfReportedImpact" defaultValue="UNCLEAR" className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2">
                <option value="NEGATIVE">Negative</option>
                <option value="MIXED">Mixed</option>
                <option value="POSITIVE">Positive</option>
                <option value="UNCLEAR">Unclear</option>
              </select>
            </label>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <Shield className="h-5 w-5 text-amber-700" />
              <h2 className="text-xl font-semibold text-gray-900">Consent & Privacy</h2>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-700">
              Submitted stories are reviewed before they appear publicly.
              {user ? ` You are submitting as ${user.email}.` : ' Logging in first will link the story to your account.'}
            </div>
          </section>

          <SubmitButton className="flex w-full items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-gray-900 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-200">
            <Send className="mr-2 h-4 w-4" />
            Share Your Story
          </SubmitButton>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/stories" className="font-semibold text-amber-800 hover:text-amber-950">Read public stories</Link>
        </div>
      </div>
    </main>
  );
}
