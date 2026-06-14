import Link from 'next/link';
import { BarChart3, BookOpen, Calendar, CheckCircle2, Mic2, PenLine, Search } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { rankStoriesForSearch } from '../../lib/searchRanking';
import { SiteNav } from '../components/SiteNav';
import { formatDate } from '../components/Formatters';
import { getUseCaseIcon, getUseCaseIconTone } from '../components/useCaseIcons';

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
    ...(useCase !== 'all' ? { affectedDomain: useCase } : {}),
    ...(city !== 'all' ? { city } : {}),
  };

  const [testimonies, allStories] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        title: true,
        summary: true,
        narrativeText: true,
        city: true,
        affectedDomain: true,
        selfReportedImpact: true,
        aiImpactClassification: true,
        transcriptionText: true,
        submittedAt: true,
        brief: { select: { summary: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      select: { affectedDomain: true, city: true, _count: { select: { reactions: true } } },
    }),
  ]);

  const rankedTestimonies = search ? rankStoriesForSearch(testimonies, search) : testimonies;
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
        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-14">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
              <BookOpen className="h-8 w-8 text-yellow-300" />
              Stories
            </h1>
            <p className="mt-2 text-yellow-100/80">Community's stories and perspectives on public algorithms</p>
          </div>
          <Link href="/submit-testimony" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-gray-900 shadow-sm transition-colors hover:bg-yellow-100 sm:w-auto">
            <PenLine className="h-4 w-4" />
            Share Your Story
          </Link>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <form className="-mt-14 space-y-5 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input name="search" defaultValue={search} placeholder="Search stories..." className="min-h-11 w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-3 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300/70" />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-gray-600">
              Use Case
              <select name="useCase" defaultValue={useCase} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2">
                <option value="all">All Use Cases</option>
                {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-gray-600">
              City
              <select name="city" defaultValue={city} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2">
                <option value="all">All Cities</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button className="min-h-11 w-full rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 shadow-md sm:w-fit">
              Apply filters
            </button>
          </div>
        </form>
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Task1TranscriptionDemo />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {rankedTestimonies.map((story) => {
            const StoryIcon = getUseCaseIcon(story.affectedDomain);
            return (
            <Link key={story.id} href={`/stories/${story.id}`} className="group flex w-full items-start px-3 py-4 text-left transition-colors hover:bg-gray-50/80 sm:px-4 sm:py-3">
              <div className={`mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-8 sm:w-8 ${getUseCaseIconTone(story.affectedDomain)}`} aria-hidden="true">
                <StoryIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h3 className="mb-1 line-clamp-2 text-base font-bold text-gray-900 transition-colors group-hover:text-yellow-600">{story.title}</h3>
                <p className="mb-1.5 line-clamp-2 text-sm text-gray-600">
                  <span className="mr-1.5 inline rounded bg-gray-100 px-1 py-0.5 align-middle text-[9px] font-medium uppercase tracking-wider text-gray-400">AI summary</span>
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
            );
          })}
        </div>
      </section>

      <CommunityImpact metrics={metrics} />
    </main>
  );
}

function Task1TranscriptionDemo() {
  const segments = [
    { start: 0.0, end: 3.3, text: 'I remember when I saw you for the first time' },
    { start: 3.3, end: 6.6, text: 'You were laughing sparkly like a new dime' },
    { start: 6.6, end: 11.51, text: "You'd be mine" },
  ];

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Mic2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-950">Task 1 transcription result</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Whisper small converted the sample audio into raw story text. This is transcript output, not the AI-generated summary.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-64">
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">small</span>
            <span className="text-slate-500">model</span>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">en</span>
            <span className="text-slate-500">language</span>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">15.0s</span>
            <span className="text-slate-500">audio</span>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">
          I remember when I saw you for the first time You were laughing sparkly like a new dime You&apos;d be mine
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={`${segment.start}-${segment.end}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500">{segment.start.toFixed(1)}s - {segment.end.toFixed(2)}s</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityImpact({ metrics }) {
  const entries = Object.entries(metrics.storiesByUseCase).sort((a, b) => b[1] - a[1]);
  const colors = ['bg-yellow-400', 'bg-yellow-500', 'bg-amber-500', 'bg-amber-600', 'bg-yellow-200', 'bg-amber-200'];

  return (
    <section className="relative overflow-hidden border-y border-slate-200/80 bg-gradient-to-br from-amber-50 to-slate-100">
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(51,65,85,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.14)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-14">
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
