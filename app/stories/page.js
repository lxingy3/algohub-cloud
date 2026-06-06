import Link from 'next/link';
import { BookOpen, PenLine, Search } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatDate } from '../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function StoriesPage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || '');
  const useCase = String(params?.useCase || 'all');
  const city = String(params?.city || 'all');
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();

  const where = {
    jurisdictionId,
    moderationStatus: 'APPROVED',
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
            { narrativeText: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(useCase !== 'all' ? { affectedDomain: useCase } : {}),
    ...(city !== 'all' ? { city } : {}),
  };

  const [testimonies, allStories] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        algorithmLinks: { include: { algorithm: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      select: { affectedDomain: true, city: true },
    }),
  ]);

  const useCases = [...new Set(allStories.map((item) => item.affectedDomain).filter(Boolean))];
  const cities = [...new Set(allStories.map((item) => item.city).filter(Boolean))];
  const negativeCount = testimonies.filter((item) => item.selfReportedImpact === 'NEGATIVE').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-stone-900 to-amber-900 text-white">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Community testimony</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-black">
              <BookOpen className="h-9 w-9 text-amber-300" />
              Stories
            </h1>
            <p className="mt-3 max-w-2xl text-amber-50/85">Approved community experiences with public algorithms and automated decisions.</p>
          </div>
          <Link href="/submit-testimony" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-amber-100">
            <PenLine className="h-5 w-5" />
            Share Your Story
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <form className="-mt-14 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input name="search" defaultValue={search} placeholder="Search stories" className="w-full rounded-md border border-slate-200 bg-white px-10 py-3" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-slate-600">
              Domain
              <select name="useCase" defaultValue={useCase} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950">
                <option value="all">All domains</option>
                {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              City
              <select name="city" defaultValue={city} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950">
                <option value="all">All cities</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button className="self-end rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Apply filters</button>
          </div>
        </form>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric value={testimonies.length} label="Visible stories" />
          <Metric value={negativeCount} label="Negative impact reports" />
          <Metric value={testimonies.reduce((sum, item) => sum + item._count.comments, 0)} label="Approved comments" />
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {testimonies.map((testimony) => (
            <Link key={testimony.id} href={`/stories/${testimony.id}`} className="block border-b border-slate-100 p-5 last:border-b-0 hover:bg-amber-50/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{testimony.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{testimony.summary}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{formatDate(testimony.submittedAt)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{testimony.city || 'City not listed'}</span>
                <span>/</span>
                <span>{testimony.affectedDomain || 'Domain not listed'}</span>
                <span>/</span>
                <span>{testimony._count.reactions} reactions</span>
                <span>/</span>
                <span>{testimony._count.comments} comments</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}
