import Link from 'next/link';
import { ChevronDown, Database, Search } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { rankAlgorithmsForSearch } from '../../lib/searchRanking';
import { SiteNav } from '../components/SiteNav';
import { AlgorithmsRegistry } from '../components/AlgorithmsRegistry';
import { getUseCaseIconMeta } from '../components/useCaseIcons';

export const dynamic = 'force-dynamic';

export default async function AlgorithmsPage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || '');
  const useCase = String(params?.useCase || 'all');
  const location = String(params?.location || 'all');
  const hasFilters = Boolean(search.trim() || useCase !== 'all' || location !== 'all');
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();

  const where = {
    jurisdictionId,
    ...(useCase !== 'all' ? { useCase } : {}),
    ...(location !== 'all' ? { location } : {}),
  };

  const [algorithms, allAlgorithms] = await Promise.all([
    prisma.algorithm.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            testimonyLinks: { where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } } },
          },
        },
        claims: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        testimonyLinks: {
          where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } },
          include: {
            testimony: {
              select: {
                id: true,
                title: true,
                summary: true,
                narrativeText: true,
              },
            },
          },
          take: 5,
        },
      },
    }),
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      select: { useCase: true, location: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const rankedAlgorithms = search ? rankAlgorithmsForSearch(algorithms, search) : algorithms;
  const useCases = [...new Set(allAlgorithms.map((item) => item.useCase).filter(Boolean))];
  const locations = [...new Set(allAlgorithms.map((item) => item.location).filter(Boolean))];
  const registryItems = rankedAlgorithms.map((algorithm) => ({
    id: algorithm.id,
    slug: algorithm.slug,
    name: algorithm.name,
    description: algorithm.description || '',
    purpose: algorithm.purpose || '',
    agencyName: algorithm.agencyName || '',
    agencyType: algorithm.agencyType || '',
    useCase: algorithm.useCase,
    location: algorithm.location,
    dataUsed: algorithm.dataUsed || '',
    decisionType: algorithm.decisionType || '',
    yearIntroduced: algorithm.yearIntroduced,
    yearDeployed: algorithm.yearDeployed,
    status: algorithm.status,
    currentVersion: algorithm.currentVersion || '',
    impactLevel: algorithm.impactLevel || '',
    officialDocumentationUrl: algorithm.officialDocumentationUrl || '',
    storyboardSvg: algorithm.storyboardSvg || '',
    storyCount: algorithm._count.testimonyLinks,
    relatedStories: algorithm.testimonyLinks.map((link) => link.testimony),
    claims: algorithm.claims.map((claim) => ({
      id: claim.id,
      claimText: claim.claimText,
      claimSource: claim.claimSource || '',
    })),
    documents: algorithm.documents.map((document) => ({
      id: document.id,
      title: document.title,
      sourceType: document.sourceType,
      sourceUrl: document.sourceUrl || '',
    })),
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.28]">
          <defs>
            <linearGradient id="algorithmsHeaderMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#algorithmsHeaderMesh)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
            <path d="M120 130 L130 176 M240 160 L250 204 M350 118 L375 166 M470 146 L505 194 M590 108 L635 158 M720 136 L770 188 M860 96 L900 152 M980 130 L1040 178" />
            <path d="M120 130 L220 88 L330 112 L450 74 L570 104 L700 70 L840 100 L970 66 L1120 92" />
          </g>
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <Database className="h-8 w-8 text-yellow-300" />
            Algorithm Registry
          </h1>
          <p className="mt-2 text-yellow-100/80">Browse and explore all registered public algorithms</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <form className="-mt-14 space-y-6 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:p-6">
          <input type="hidden" name="useCase" value={useCase} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search algorithms..."
              className="min-h-11 w-full rounded-md border border-gray-200 bg-white py-2 pl-10 pr-3 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300/70"
            />
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-6">
            <p className="text-sm font-semibold text-gray-700">Filters</p>
            <div className="flex flex-col gap-4 sm:gap-6">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-600 sm:flex-row sm:items-center">
                <span className="sm:w-28">Location</span>
                <select name="location" defaultValue={location} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 sm:w-[220px]">
                  <option value="all">All Locations</option>
                  {locations.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <span className="shrink-0 pt-1 text-sm font-medium text-gray-600 sm:w-28">Use Case</span>
                <details className="group" open={useCase !== 'all'}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 md:hidden">
                    {useCase === 'all' ? 'Choose a use case' : useCase}
                    <ChevronDown aria-hidden="true" className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 hidden flex-wrap gap-2 group-open:flex md:mt-0 md:flex">
                  <FilterPill href={algorithmFilterHref({ search, location, useCase: 'all' })} active={useCase === 'all'}>All Use Cases</FilterPill>
                  {useCases.map((item) => (
                    <FilterPill key={item} href={algorithmFilterHref({ search, location, useCase: item })} active={useCase === item}>
                      <UseCaseFilterLabel useCase={item} />
                    </FilterPill>
                  ))}
                  </div>
                </details>
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                {hasFilters ? <Link href="/algorithms" className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 sm:w-fit">Clear filters</Link> : null}
                <button className="min-h-11 w-full rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 shadow-md sm:w-fit">
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Algorithm Profiles</h2>
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{rankedAlgorithms.length}</span> of {allAlgorithms.length}
          </p>
        </div>
        {registryItems.length ? (
          <AlgorithmsRegistry algorithms={registryItems} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">No algorithms match these filters</h3>
            <Link href="/algorithms" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-900">Clear filters</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function UseCaseFilterLabel({ useCase }) {
  const { icon: Icon } = getUseCaseIconMeta(useCase);
  return (
    <>
      <Icon className="h-3.5 w-3.5" />
      {useCase}
    </>
  );
}

function FilterPill({ href, active, children }) {
  return (
    <Link
      href={href}
      className={active
        ? 'inline-flex min-h-10 items-center gap-1.5 rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 shadow-md'
        : 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'}
    >
      {children}
    </Link>
  );
}

function algorithmFilterHref({ search, location, useCase }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (location !== 'all') params.set('location', location);
  if (useCase !== 'all') params.set('useCase', useCase);
  const query = params.toString();
  return `/algorithms${query ? `?${query}` : ''}`;
}
