import Link from 'next/link';
import { BarChart3, BookOpen, Calendar, FileText, Mic, PenLine, Search, Video } from 'lucide-react';
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
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      select: { affectedDomain: true, city: true, _count: { select: { reactions: true } } },
    }),
  ]);

  const useCases = [...new Set(allStories.map((item) => item.affectedDomain).filter(Boolean))];
  const cities = [...new Set(allStories.map((item) => item.city).filter(Boolean))];
  const storiesByUseCase = allStories.reduce((acc, story) => {
    const key = story.affectedDomain || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const metrics = {
    storiesShared: allStories.length,
    algorithmsAffected: Object.keys(storiesByUseCase).length,
    statesRepresented: cities.length,
    voicesUnited: allStories.reduce((sum, story) => sum + story._count.reactions, 0),
    storiesByUseCase,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.24]">
          <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
          </g>
        </svg>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
              <BookOpen className="h-8 w-8 text-yellow-300" />
              Stories
            </h1>
            <p className="mt-2 text-yellow-100/80">Community's stories and perspectives on public algorithms</p>
          </div>
          <Link href="/submit-testimony" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-gray-900 shadow-sm transition-colors hover:bg-yellow-100">
            <PenLine className="h-4 w-4" />
            Share Your Story
          </Link>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <form className="-mt-14 space-y-5 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input name="search" defaultValue={search} placeholder="Search stories..." className="w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-3 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300/70" />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-gray-600">
              Use Case
              <select name="useCase" defaultValue={useCase} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2">
                <option value="all">All Use Cases</option>
                {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-gray-600">
              City
              <select name="city" defaultValue={city} className="w-full rounded-md border border-gray-200 bg-white px-3 py-2">
                <option value="all">All Cities</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <button className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 shadow-md">
            Apply filters
          </button>
        </form>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {testimonies.map((story, index) => (
            <Link key={story.id} href={`/stories/${story.id}`} className="group flex w-full items-start px-4 py-3 text-left transition-colors hover:bg-gray-50/80">
              <div className={`mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${index % 3 === 0 ? 'border-rose-200 bg-rose-50 text-rose-600' : index % 3 === 1 ? 'border-purple-200 bg-purple-50 text-purple-600' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>
                {index % 3 === 0 ? <Video className="h-4 w-4" /> : index % 3 === 1 ? <Mic className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h3 className="mb-1 line-clamp-2 text-base font-bold text-gray-900 transition-colors group-hover:text-yellow-600">{story.title}</h3>
                <p className="mb-1.5 line-clamp-2 text-sm text-gray-600">
                  <span className="mr-1.5 inline rounded bg-gray-100 px-1 py-0.5 align-middle text-[9px] font-medium uppercase tracking-wider text-gray-400">Summary</span>
                  {story.summary}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {story.affectedDomain ? <span className="rounded border border-gray-300 bg-gray-50 px-1.5 text-[10px] text-gray-700">{story.affectedDomain}</span> : null}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(story.submittedAt)}
                  </span>
                  <span>{story._count.reactions} reactions</span>
                  <span>{story._count.comments} comments</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CommunityImpact metrics={metrics} />
    </main>
  );
}

function CommunityImpact({ metrics }) {
  const entries = Object.entries(metrics.storiesByUseCase).sort((a, b) => b[1] - a[1]);
  const colors = ['bg-yellow-400', 'bg-yellow-500', 'bg-amber-500', 'bg-amber-600', 'bg-yellow-200', 'bg-amber-200'];

  return (
    <section className="relative overflow-hidden border-y border-slate-200/80 bg-gradient-to-br from-amber-50 to-slate-100">
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(51,65,85,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.14)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 shadow-sm">
          <BarChart3 className="h-4 w-4 text-amber-700" />
          <span className="text-sm font-medium text-amber-800">Community Metrics</span>
        </div>
        <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-gray-900 md:text-3xl">
          <BarChart3 className="h-6 w-6 text-amber-700" />
          Community Impact
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard label="Stories Shared" value={metrics.storiesShared} />
          <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
            <span className="mb-4 block text-sm font-medium text-gray-600">Algorithms Affected</span>
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-[18px] border-yellow-400 bg-white text-3xl font-bold text-gray-900">
              {metrics.algorithmsAffected}
            </div>
            <ul className="w-full max-w-[190px] space-y-1">
              {entries.slice(0, 6).map(([name, value], index) => (
                <li key={name} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${colors[index % colors.length]}`} />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="font-medium text-gray-900">{value}</span>
                </li>
              ))}
            </ul>
          </div>
          <MetricCard label="States Represented" value={metrics.statesRepresented} />
          <MetricCard label="Voices United" value={metrics.voicesUnited} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
      <span className="mb-3 block text-sm font-medium text-gray-600">{label}</span>
      <span className="text-4xl font-bold tabular-nums text-gray-900 md:text-5xl">{value}</span>
    </div>
  );
}
