'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Bot, Code2, Database, Image, Info, Landmark, Settings, User, Users, X } from 'lucide-react';
import { formatStatus } from './Formatters';

export function AlgorithmsRegistry({ algorithms }) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setSelectedAlgorithm(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {algorithms.map((algorithm) => (
          <button
            key={algorithm.id}
            type="button"
            onClick={() => setSelectedAlgorithm(algorithm)}
            className="group flex h-full flex-col rounded-lg border border-slate-200 border-l-4 border-l-yellow-500 bg-white p-5 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
              <span className={algorithm.storyCount === 0
                ? 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500'
                : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800'}
              >
                {algorithm.storyCount} testimonies
              </span>
            </div>
            <h2 className="mt-4 text-lg font-black leading-snug group-hover:text-amber-800">{algorithm.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{algorithm.description}</p>
            <dl className="mt-5 grid gap-2 text-xs text-slate-500">
              <div><dt className="font-semibold text-slate-700">Agency</dt><dd>{algorithm.agencyName || 'Not listed'}</dd></div>
              <div><dt className="font-semibold text-slate-700">Use case</dt><dd>{algorithm.useCase}</dd></div>
              <div><dt className="font-semibold text-slate-700">Location</dt><dd>{algorithm.location}</dd></div>
            </dl>
          </button>
        ))}
      </section>

      {selectedAlgorithm ? (
        <AlgorithmModal algorithm={selectedAlgorithm} onClose={() => setSelectedAlgorithm(null)} />
      ) : null}
    </>
  );
}

function AlgorithmModal({ algorithm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8" role="dialog" aria-modal="true">
      <button type="button" className="fixed inset-0 cursor-default" aria-label="Close algorithm modal" onClick={onClose} />
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-2xl font-black leading-tight text-slate-950">{algorithm.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{algorithm.useCase} / {algorithm.location}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-6">
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
                    <span title="Impact measures the scale and severity of how this algorithm affects the community" className="inline-flex text-yellow-600">
                      <Info className="h-3.5 w-3.5" />
                    </span>
                  </div>
                ) : (
                  <dd className="font-semibold text-gray-900">N/A</dd>
                )}
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Database className="h-5 w-5 text-yellow-600" />
              Details
            </h3>
            <div className="space-y-4">
              <InfoBlock label="Purpose" value={algorithm.purpose || 'N/A'} />
              <InfoBlock label="Data Used" value={algorithm.dataUsed || 'N/A'} />
              <InfoBlock label="Decision Type" value={algorithm.decisionType || 'N/A'} />
              <div className="grid gap-4 pt-2 md:grid-cols-3">
                <InfoItem label="Year Deployed" value={algorithm.yearDeployed || 'N/A'} />
                <InfoItem label="Status" value={formatStatus(algorithm.status) || 'N/A'} />
                <InfoItem label="Current Version" value={algorithm.currentVersion || 'N/A'} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Image className="h-5 w-5 text-yellow-600" />
              StoryBoard
            </h3>
            <p className="mb-4 text-sm text-gray-600">A visual narrative of the algorithm's real-world application and function</p>
            <Storyboard algorithm={algorithm} />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
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

function Storyboard({ algorithm }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="relative mx-auto min-h-[170px] max-w-3xl overflow-hidden rounded-md bg-white p-4">
        <div className="absolute left-[12%] right-[12%] top-[46%] border-t-2 border-dashed border-slate-300" />
        <div className="relative z-10 grid grid-cols-4 items-center gap-4 text-center">
          <StoryNode icon={<Users className="h-9 w-9 text-slate-900" />} label="DEVELOPMENT TEAM" />
          <StoryNode icon={<Code2 className="h-8 w-8 text-slate-900" />} label={algorithm.name} subLabel="AI TOOL" />
          <StoryNode icon={<Landmark className="h-11 w-11 text-slate-900" />} label={algorithm.agencyName || 'PUBLIC AGENCY'} subLabel="USED BY" />
          <StoryNode
            icon={<User className="h-9 w-9 text-slate-900" />}
            label="AGENCY STAFF"
            title={algorithm.purpose || 'Purpose not listed'}
          />
        </div>
        <div className="relative z-10 mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            <Bot className="h-4 w-4" />
            Public-service workflow
            <Settings className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryNode({ icon, label, subLabel, title }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-end" title={title}>
      <div className="mb-3 flex h-14 items-center justify-center">{icon}</div>
      {subLabel ? <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{subLabel}</div> : null}
      <div className="flex min-h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold uppercase leading-tight text-slate-800 shadow-sm">
        {label}
      </div>
    </div>
  );
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
