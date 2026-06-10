'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpen, Code2, Database, FileText, Image, Info, Landmark, MapPin, MessageSquareQuote, Settings, User, Users, X } from 'lucide-react';
import { formatStatus } from './Formatters';
import { InfoTooltip } from './InfoTooltip';

const IMPACT_HELP = 'Impact measures the scale and severity of how this algorithm affects the community';

export function AlgorithmsRegistry({ algorithms }) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAlgorithmId = searchParams.get('algorithmId');

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') closeAlgorithmModal({ pathname, router, searchParams, setSelectedAlgorithm });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!selectedAlgorithmId) {
      setSelectedAlgorithm(null);
      return;
    }
    const algorithm = algorithms.find((item) => item.id === selectedAlgorithmId);
    if (algorithm) setSelectedAlgorithm(algorithm);
  }, [algorithms, selectedAlgorithmId]);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {algorithms.map((algorithm) => (
          <a
            key={algorithm.id}
            href={algorithmHref({ pathname, searchParams, algorithmId: algorithm.id })}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              openAlgorithmModal({ pathname, router, searchParams, algorithmId: algorithm.id });
            }}
            className="group flex h-full flex-col rounded-lg border border-gray-200 border-l-4 border-l-yellow-500 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold leading-tight text-gray-900 transition-colors group-hover:text-yellow-600">
                {algorithm.name}
              </h3>
              <StoryCountBadge count={algorithm.storyCount || 0} />
            </div>

            {algorithm.useCase ? (
              <span className="mb-4 w-fit rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700">
                {algorithm.useCase}
              </span>
            ) : null}

            <p className="line-clamp-3 flex-1 text-sm leading-6 text-gray-600">
              {algorithm.description}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-gray-600">
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{algorithm.location || 'Location not listed'}</span>
              </span>
              {algorithm.impactLevel ? <ImpactBadge impactLevel={algorithm.impactLevel} /> : null}
            </div>
          </a>
        ))}
      </div>

      {selectedAlgorithm ? (
        <AlgorithmModal algorithm={selectedAlgorithm} onClose={() => closeAlgorithmModal({ pathname, router, searchParams, setSelectedAlgorithm })} />
      ) : null}
    </>
  );
}

function algorithmHref({ pathname, searchParams, algorithmId }) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('algorithmId', algorithmId);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function openAlgorithmModal({ pathname, router, searchParams, algorithmId }) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('algorithmId', algorithmId);
  const query = params.toString();
  replaceWithoutScroll(router, query ? `${pathname}?${query}` : pathname);
}

function closeAlgorithmModal({ pathname, router, searchParams, setSelectedAlgorithm }) {
  setSelectedAlgorithm(null);
  const params = new URLSearchParams(searchParams.toString());
  params.delete('algorithmId');
  const query = params.toString();
  replaceWithoutScroll(router, query ? `${pathname}?${query}` : pathname);
}

function replaceWithoutScroll(router, href) {
  const scrollY = typeof window === 'undefined' ? 0 : window.scrollY;
  router.replace(href, { scroll: false });
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' }));
  });
}

export function AlgorithmModal({ algorithm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-3 py-3 sm:px-4 sm:py-8" role="dialog" aria-modal="true">
      <button type="button" className="fixed inset-0 cursor-default" aria-label="Close algorithm modal" onClick={onClose} />
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl sm:max-h-none">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{algorithm.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{algorithm.useCase} / {algorithm.location}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950" aria-label="Close algorithm details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:space-y-6 sm:p-5">
          <section className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Database className="h-5 w-5 text-yellow-600" />
              Overview
            </h3>
            <dl className="grid gap-4 md:grid-cols-3">
              <InfoItem label="Algorithm Name" value={algorithm.name} />
              <InfoItem label="Used By" value={algorithm.agencyName || 'N/A'} />
              <InfoItem label="Year Introduced/Updated" value={algorithm.yearIntroduced || algorithm.yearDeployed || 'N/A'} />
              <InfoItem label="Use Case" value={algorithm.useCase || 'N/A'} />
              <InfoItem label="Location" value={algorithm.location || 'N/A'} />
              <div>
                <dt className="mb-1 text-sm text-gray-600">Impact Level</dt>
                {algorithm.impactLevel ? (
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${impactClass(algorithm.impactLevel)}`}>
                      {formatStatus(algorithm.impactLevel)} Impact
                    </span>
                    <InfoTooltip label={IMPACT_HELP}>
                      <Info className="h-3.5 w-3.5" />
                    </InfoTooltip>
                  </div>
                ) : (
                  <dd className="font-semibold text-gray-900">N/A</dd>
                )}
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Database className="h-5 w-5 text-yellow-600" />
              Details
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <InfoBlock label="Purpose" value={algorithm.purpose || 'N/A'} />
                <InfoBlock label="Data Used" value={algorithm.dataUsed || 'N/A'} />
                <InfoBlock label="Decision Type" value={algorithm.decisionType || 'N/A'} />
              </div>
              <div className="grid gap-4 rounded-lg bg-slate-50 p-4">
                <InfoItem label="Year Deployed" value={algorithm.yearDeployed || 'N/A'} />
                <InfoItem label="Status" value={formatStatus(algorithm.status) || 'N/A'} />
                <InfoItem label="Current Version" value={algorithm.currentVersion || 'N/A'} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Image className="h-5 w-5 text-yellow-600" />
              StoryBoard
            </h3>
            <p className="mb-4 text-sm text-gray-600">A visual narrative of the algorithm's real-world application and function</p>
            <Storyboard algorithm={algorithm} />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <FileText className="h-5 w-5 text-yellow-600" />
                Official Documents
              </h3>
              {algorithm.documents.length ? (
                <div className="space-y-3">
                  {algorithm.documents.map((document) => {
                    const href = document.sourceUrl || algorithm.officialDocumentationUrl;
                    const className = 'block rounded-md border border-slate-200 p-4 text-sm hover:border-yellow-300';
                    const content = (
                      <>
                        <span className="font-semibold text-gray-900">{document.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">{formatStatus(document.sourceType)}</span>
                      </>
                    );

                    return href ? (
                      <a key={document.id} href={href} className={className} target="_blank" rel="noreferrer">
                        {content}
                      </a>
                    ) : (
                      <div key={document.id} className={className}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No documents have been attached yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <MessageSquareQuote className="h-5 w-5 text-yellow-600" />
                Official Claims
              </h3>
              {algorithm.claims.length ? (
                <div className="space-y-3">
                  {algorithm.claims.map((claim) => (
                    <div key={claim.id} className="rounded-md bg-amber-50 p-4">
                      <p className="text-sm leading-6 text-slate-800">{claim.claimText}</p>
                      <p className="mt-2 text-xs text-slate-500">{claim.claimSource || 'Source not listed'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No official claims have been attached yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <BookOpen className="h-5 w-5 text-yellow-600" />
              Related Stories
            </h3>
            {algorithm.relatedStories.length ? (
              <div className="space-y-3">
                {algorithm.relatedStories.map((story) => (
                  <Link key={story.id} href={`/stories/${story.id}`} className="group block rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 transition-all hover:border-yellow-400 hover:shadow-md">
                    <h4 className="font-semibold text-gray-900 group-hover:text-yellow-700">{story.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{story.summary || story.narrativeText}</p>
                    <span className="mt-2 flex items-center gap-1 text-sm font-medium text-yellow-700">
                      Read story
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No approved related stories are linked yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StoryCountBadge({ count }) {
  const tone = count === 0
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-800';

  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
      {count} {count === 1 ? 'Story' : 'Stories'}
    </span>
  );
}

function ImpactBadge({ impactLevel }) {
  const label = `${formatStatus(impactLevel)} Impact`;
  const tone = impactLevel === 'HIGH'
    ? 'bg-red-100 text-red-700'
    : impactLevel === 'MEDIUM'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1 text-sm font-bold ${tone}`}>
      {label}
      <InfoTooltip label={IMPACT_HELP} className="text-yellow-600">
        <Info className="h-4 w-4" />
      </InfoTooltip>
    </span>
  );
}

function Storyboard({ algorithm }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="overflow-x-auto rounded-md bg-white p-4">
        <div className="relative mx-auto min-h-[230px] min-w-[720px] max-w-4xl">
          <div className="absolute left-[9%] right-[9%] top-[34%] border-t-2 border-dashed border-slate-300" />
          <div className="absolute left-[62%] right-[9%] top-[61%] border-t-2 border-dashed border-slate-300" />

          <div className="relative z-10 grid grid-cols-5 items-start gap-4 text-center">
            <StoryNode
              icon={
                <div className="relative">
                  <Users className="h-10 w-10 text-slate-900" />
                  <Settings className="absolute -bottom-2 -right-2 h-5 w-5 text-slate-700" />
                </div>
              }
              label="DEVELOPMENT TEAM"
            />
            <StoryNode icon={<Code2 className="h-9 w-9 text-slate-900" />} label={algorithm.name} subLabel="AI TOOL" />
            <StoryNode icon={<Landmark className="h-12 w-12 text-slate-900" />} label={algorithm.agencyName || 'PUBLIC AGENCY'} subLabel="USED BY" />
            <div className="flex min-h-44 flex-col items-center">
              <div className="mb-1 flex h-12 items-center justify-center">
                <Code2 className="h-8 w-8 text-slate-900" />
              </div>
              <div className="mb-6 rounded border border-slate-300 bg-white px-2 py-0.5 text-[9px] font-bold uppercase leading-tight text-slate-700 shadow-sm">
                AI TOOL
              </div>
              <InfoTooltip label={algorithm.purpose || 'Purpose not listed'} className="mt-2 flex-col items-center text-slate-900" block>
                <User className="mb-2 h-8 w-8 text-slate-900" />
                <div className="flex min-h-10 w-full min-w-32 items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase leading-tight text-slate-800 shadow-sm">
                  AGENCY STAFF
                </div>
              </InfoTooltip>
            </div>
            <StoryNode icon={<Users className="h-12 w-12 text-slate-900" />} label="PEOPLE" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryNode({ icon, label, subLabel, title }) {
  const content = (
    <div className="flex min-h-36 flex-col items-center justify-end">
      <div className="mb-3 flex h-14 items-center justify-center">{icon}</div>
      {subLabel ? <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{subLabel}</div> : null}
      <div className="flex min-h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase leading-tight text-slate-800 shadow-sm">
        {label}
      </div>
    </div>
  );

  return title ? <InfoTooltip label={title} className="text-slate-900" block>{content}</InfoTooltip> : content;
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="mb-1 text-sm text-gray-600">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-600">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}

function impactClass(value) {
  if (value === 'LOW') return 'bg-green-100 text-green-800';
  if (value === 'MEDIUM') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
