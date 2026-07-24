import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Search, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { prisma } from '../../lib/prisma';
import { SiteNav } from '../components/SiteNav';

export const dynamic = 'force-dynamic';

const briefingTypes = ['ALGORITHM_SPECIFIC', 'THEMATIC', 'SILENCE_REPORT', 'CROSS_CUTTING'];

export default async function BriefingsPage({ searchParams }) {
  const query = await searchParams;
  if (query?.lens || query?.scope || query?.algorithm || query?.language || query?.reading) {
    redirect(`/briefings/explore?${toSearchParams(query).toString()}`);
  }

  const user = await getCurrentUser();
  const type = briefingTypes.includes(query?.type) ? query.type : '';
  const search = typeof query?.q === 'string' ? query.q.trim().slice(0, 100) : '';
  const briefings = await prisma.briefing.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      reviewStatus: 'PUBLISHED',
      ...(type ? { briefingType: type } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { executiveSummary: { contains: search, mode: 'insensitive' } },
          { targetTheme: { contains: search, mode: 'insensitive' } },
          { targetAlgorithm: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      briefingType: true,
      targetTheme: true,
      testimonyCount: true,
      executiveSummary: true,
      publishedAt: true,
      dateRangeStart: true,
      dateRangeEnd: true,
      generatedBy: true,
      targetAlgorithm: { select: { name: true, slug: true, agencyName: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return (
    <main className="min-h-screen bg-[#f4f0e7] text-slate-950">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden border-b border-amber-300/20 bg-[#171a1f] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Reviewed evidence library</p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">Community evidence, assembled for decisions.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Read published briefings, check their evidence window and review provenance, or open the six interactive evidence views.
            </p>
          </div>
          <Link
            href="/briefings/explore?lens=community&scope=overview&reading=standard&language=en"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-300/60 bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Explore all six views
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
              {briefings.length} {briefings.length === 1 ? 'briefing' : 'briefings'}
            </p>
            <h2 className="mt-2 font-serif text-3xl">Published briefings</h2>
          </div>
          <form action="/briefings" className="flex flex-col gap-2 sm:flex-row" role="search">
            <label className="sr-only" htmlFor="briefing-search">Search briefings</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                id="briefing-search"
                name="q"
                defaultValue={search}
                placeholder="Search title, theme, or system"
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm shadow-sm sm:w-72"
              />
            </div>
            <label className="sr-only" htmlFor="briefing-type">Briefing type</label>
            <select id="briefing-type" name="type" defaultValue={type} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm">
              <option value="">All types</option>
              {briefingTypes.map((value) => <option key={value} value={value}>{typeLabel(value)}</option>)}
            </select>
            <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-amber-700">Filter</button>
          </form>
        </div>

        {briefings.length ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {briefings.map((briefing, index) => (
              <article key={briefing.id} className="group relative overflow-hidden rounded-xl border border-slate-300 bg-[#fffdf8] p-6 shadow-[0_10px_30px_rgba(15,23,42,.06)] transition hover:-translate-y-1 hover:border-amber-500 hover:shadow-[0_18px_45px_rgba(15,23,42,.12)]">
                <div className="absolute right-5 top-4 font-serif text-5xl text-slate-200" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                <div className="relative pr-14">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{typeLabel(briefing.briefingType)}</span>
                    <span className="text-slate-500">{briefing.targetAlgorithm?.name || briefing.targetTheme || 'Cross-cutting corpus'}</span>
                  </div>
                  <h3 className="mt-5 font-serif text-2xl leading-tight">
                    <Link href={`/briefings/${briefing.slug}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                      {briefing.title}
                    </Link>
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {briefing.executiveSummary || 'Open the briefing to review its findings and evidence provenance.'}
                  </p>
                </div>
                <dl className="relative mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Stories</dt>
                    <dd className="mt-1 font-bold">{briefing.testimonyCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Published</dt>
                    <dd className="mt-1 font-bold">{formatDate(briefing.publishedAt)}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Reviewed by</dt>
                    <dd className="mt-1 truncate font-bold">{briefing.reviewedBy?.name || 'Editorial review'}</dd>
                  </div>
                </dl>
                <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-800">
                  Read briefing <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-400 bg-white/70 px-6 py-14 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-amber-700" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-2xl">No published briefings match this search.</h3>
            <p className="mt-2 text-sm text-slate-600">Clear the filters or use the evidence explorer while a reviewed narrative is prepared.</p>
            <Link href="/briefings" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-bold text-white">Clear filters</Link>
          </div>
        )}

        <aside className="mt-10 flex flex-col gap-4 rounded-xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
            <div>
              <h2 className="font-bold">Need the underlying evidence?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">The interactive explorer keeps all six audience views, reading levels, filters, and story drill-downs.</p>
            </div>
          </div>
          <Link href="/briefings/explore?lens=community&scope=overview&reading=standard&language=en" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-amber-700 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100">
            Open evidence explorer
          </Link>
        </aside>
      </section>
    </main>
  );
}

function toSearchParams(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string') params.append(key, item);
    }
  }
  return params;
}

function typeLabel(value) {
  return {
    ALGORITHM_SPECIFIC: 'Algorithm-specific',
    THEMATIC: 'Thematic',
    SILENCE_REPORT: 'Silence report',
    CROSS_CUTTING: 'Cross-cutting',
  }[value] || 'Briefing';
}

function formatDate(value) {
  if (!value) return 'Not dated';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(value);
}
