import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatDate, formatStatus } from '../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function MyStoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      userId: user.id,
    },
    orderBy: { submittedAt: 'desc' },
    include: {
      algorithmLinks: { include: { algorithm: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <FileText className="h-8 w-8 text-yellow-300" />
            My Stories
          </h1>
          <p className="mt-2 text-yellow-100/80">Review the status of stories you submitted.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {testimonies.length ? (
          <div className="space-y-4">
            {testimonies.map((testimony) => (
              <article key={testimony.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <StatusBadge status={testimony.moderationStatus} />
                      <span>{formatDate(testimony.submittedAt)}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{testimony.title || 'Untitled story'}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                      {testimony.summary || testimony.narrativeText}
                    </p>
                  </div>
                  {testimony.moderationStatus === 'APPROVED' ? (
                    <Link href={`/stories/${testimony.id}`} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:border-amber-300 sm:w-auto">
                      View public page
                    </Link>
                  ) : null}
                </div>

                {testimony.algorithmLinks.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {testimony.algorithmLinks.map((link) => (
                      <span key={link.algorithmId} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                        {link.algorithm.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {testimony.moderationNotes ? (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-amber-800">Moderator note</div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-800">{testimony.moderationNotes}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>{testimony._count.reactions} reactions</span>
                  <span>{testimony._count.comments} public comments</span>
                  {testimony.moderationStatus === 'PENDING' ? <span>Not public yet</span> : null}
                  {testimony.moderationStatus === 'REJECTED' ? <span>Not visible on the public stories page</span> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No stories yet</h2>
            <p className="mt-2 text-sm text-gray-500">Stories you submit while logged in will appear here.</p>
            <Link href="/submit-testimony" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400">
              Share Your Story
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }) {
  const settings = {
    APPROVED: {
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    PENDING: {
      icon: Clock,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    },
    FLAGGED: {
      icon: AlertCircle,
      className: 'border-orange-200 bg-orange-50 text-orange-700',
    },
    REJECTED: {
      icon: XCircle,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
  };
  const config = settings[status] || settings.PENDING;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {formatStatus(status)}
    </span>
  );
}
