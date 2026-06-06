import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { SubmitTestimonyForm } from '../components/SubmitTestimonyForm';

export const dynamic = 'force-dynamic';

export default async function SubmitTestimonyPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <PenLine className="h-8 w-8 text-yellow-300" />
            Share Your Story
          </h1>
          <p className="text-yellow-100/80">Help us understand how algorithms affect people in public services.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <SubmitTestimonyForm
          algorithms={algorithms}
          selectedAlgorithmId={params?.algorithmId || ''}
          currentUserEmail={user?.email || ''}
        />
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/stories" className="font-semibold text-amber-800 hover:text-amber-950">Read public stories</Link>
        </div>
      </div>
    </main>
  );
}
