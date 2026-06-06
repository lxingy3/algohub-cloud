import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Database, Eye, Users } from 'lucide-react';
import { prisma } from '../lib/prisma';
import { getJurisdictionId } from '../lib/jurisdiction';
import { getCurrentUser } from '../lib/auth';
import { SiteNav } from './components/SiteNav';
import { formatDate, formatStatus } from './components/Formatters';
import { HomeAISystemsDiagram } from './components/HomeAISystemsDiagram';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();
  const [algorithmCount, testimonyCount, eventCount, featuredAlgorithms, recentStories, upcomingEvents] = await Promise.all([
    prisma.algorithm.count({ where: { jurisdictionId } }),
    prisma.testimony.count({ where: { jurisdictionId } }),
    prisma.communityEvent.count({ where: { jurisdictionId } }),
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: [{ impactLevel: 'asc' }, { name: 'asc' }],
      take: 3,
      include: { _count: { select: { testimonyLinks: true } } },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      include: { _count: { select: { comments: true, reactions: true } } },
    }),
    prisma.communityEvent.findMany({
      where: { jurisdictionId },
      orderBy: { date: 'asc' },
      take: 3,
      include: { organizer: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#f4c542_0,#a66b08_35%,#111827_72%)] text-white">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 420" className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
          <g fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.2">
            <path d="M0 310 L140 260 L265 295 L405 225 L530 270 L665 205 L810 252 L950 190 L1070 230 L1200 170" />
            <path d="M0 370 L145 320 L285 350 L420 295 L555 332 L690 278 L830 318 L980 260 L1200 315" />
            <path d="M140 260 L145 320 M265 295 L285 350 M405 225 L420 295 M530 270 L555 332 M665 205 L690 278 M810 252 L830 318 M950 190 L980 260" />
          </g>
          <g fill="rgba(255,255,255,.7)">
            <circle cx="265" cy="295" r="3" />
            <circle cx="405" cy="225" r="3" />
            <circle cx="665" cy="205" r="3" />
            <circle cx="810" cy="252" r="3" />
            <circle cx="950" cy="190" r="3" />
          </g>
        </svg>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100">Community accountability workspace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Stories of automated systems shaping daily life.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-amber-50/90">
              Browse public algorithm records, read community testimony, and manage review workflows in one shared application.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/algorithms" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-3 font-semibold text-amber-200 shadow-lg shadow-black/20 hover:bg-slate-800">
                <Database className="h-5 w-5" />
                Browse Algorithms
              </Link>
              <Link href="/submit-testimony" className="inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/20">
                Share Your Story
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/25 bg-white/10 p-5 backdrop-blur">
            <div className="grid gap-3">
              {[
                ['Development team', 'Builds or procures automated tools'],
                ['Public agency', 'Deploys systems in service workflows'],
                ['Community', 'Shares lived experience and feedback'],
              ].map(([title, text], index) => (
                <div key={title} className="flex items-center gap-4 rounded-md border border-white/15 bg-white/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 font-black text-slate-950">{index + 1}</div>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-amber-50/80">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeAISystemsDiagram />

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-3">
        {[
          [algorithmCount, 'Algorithms documented'],
          [testimonyCount, 'Testimonies collected'],
          [eventCount, 'Community events'],
        ].map(([count, label]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-4xl font-black">{count}</div>
            <div className="mt-1 text-sm font-medium text-slate-500">{label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-[1.25fr_.75fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Featured Algorithms</h2>
              <p className="text-sm text-slate-600">Database records with linked community testimony counts.</p>
            </div>
            <Link href="/algorithms" className="text-sm font-semibold text-amber-700 hover:text-amber-900">View all</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredAlgorithms.map((algorithm) => (
              <Link key={algorithm.id} href={`/algorithms/${algorithm.slug}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
                  <span className="text-xs text-slate-500">{algorithm._count.testimonyLinks} stories</span>
                </div>
                <h3 className="mt-4 font-bold leading-snug">{algorithm.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{algorithm.description}</p>
                <p className="mt-4 text-xs font-medium text-slate-500">{algorithm.useCase} / {algorithm.location}</p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-500 p-6 text-slate-950 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <CalendarDays className="h-5 w-5" />
            What's Happening
          </h2>
          <div className="mt-5 space-y-4">
            {upcomingEvents.map((event) => (
              <Link key={event.id} href="/events" className="block border-l-2 border-slate-950/40 pl-4">
                <div className="text-xs font-bold uppercase tracking-wide">{formatDate(event.date)}</div>
                <div className="mt-1 font-semibold">{event.title}</div>
                <div className="text-sm text-slate-800">{event.organizer?.name || event.location || 'Community event'}</div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Users className="h-6 w-6 text-amber-600" />
                Community Voices
              </h2>
              <p className="text-sm text-slate-600">Approved public stories with database-backed reactions and comments.</p>
            </div>
            <Link href="/stories" className="text-sm font-semibold text-amber-700 hover:text-amber-900">Read stories</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recentStories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-5 hover:border-amber-300">
                <BookOpen className="h-5 w-5 text-amber-600" />
                <h3 className="mt-3 font-bold">{story.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{story.summary}</p>
                <div className="mt-4 flex gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{story._count.reactions}</span>
                  <span>{story._count.comments} comments</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
