'use client';

import { useState } from 'react';

export function InlineExpandableText({ label, text, collapsedChars = 360, className = '' }) {
  const [open, setOpen] = useState(false);
  const { preview, rest, hasOverflow } = splitPreviewText(text, collapsedChars);
  if (!preview) return null;

  return (
    <section className={`relative rounded-md border p-3 ${hasOverflow ? 'pb-8' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => hasOverflow && setOpen((value) => !value)}
        className={`block w-full text-left ${hasOverflow ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={open}
      >
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {preview}
          {hasOverflow && !open ? '...' : ''}
        </p>
      </button>
      {hasOverflow && open ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{rest}</p>
      ) : null}
      {hasOverflow ? (
        <ExpandIconButton
          label={label}
          open={open}
          onClick={() => setOpen((value) => !value)}
        />
      ) : null}
    </section>
  );
}

export function MLPipelinePanel({ testimony, isVoiceInput, transcriptSummary, task2Impact, task345Insights }) {
  const [open, setOpen] = useState(false);
  const transcriptionStatus = isVoiceInput
    ? (testimony.transcriptionStatus || (testimony.transcriptionText ? 'COMPLETED' : 'PENDING'))
    : 'SKIPPED';
  const entityCount = countEntities(task345Insights.entities);
  const pipelinePreview = [
    `Task 1 ${formatStatusLabelLoose(transcriptionStatus)}`,
    `Task 2 ${task2Impact.classification || 'UNCLEAR'} (${formatConfidence(task2Impact.confidence)})`,
    `Task 3 ${task345Insights.themes.length} theme${task345Insights.themes.length === 1 ? '' : 's'}`,
    `Task 4 ${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}`,
    `Task 5 ${task345Insights.keywords.length} keyword${task345Insights.keywords.length === 1 ? '' : 's'}`,
  ].join(' | ');
  const transcriptText = testimony.transcriptionText || '';

  return (
    <section className="relative mt-4 rounded-md border border-slate-200 bg-white p-3 pb-8">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="block w-full cursor-pointer text-left"
        aria-expanded={open}
      >
        <p className="text-xs font-semibold uppercase text-slate-500">ML Pipeline</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">{pipelinePreview}</p>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Task 1 transcription</h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium uppercase text-emerald-800">{transcriptionStatus}</span>
            </div>
            {isVoiceInput ? (
              transcriptText ? (
                <div className="mt-2 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                  <p className="font-medium">{transcriptSummary}</p>
                  <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap">{transcriptText}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No transcript saved yet.</p>
              )
            ) : (
              <p className="mt-2 text-sm text-slate-600">Skipped for text input.</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-slate-500">Task 2 impact classification</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold uppercase text-white">{task2Impact.classification || 'UNCLEAR'}</span>
              <span>confidence {formatConfidence(task2Impact.confidence)}</span>
              {task2Impact.source === 'estimate' ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Not stored yet</span> : null}
              {Number(task2Impact.confidence) < 0.85 ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Needs review</span> : null}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-slate-500">Task 3 theme detection</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {task345Insights.themes.length ? task345Insights.themes.map((theme) => (
                <span key={`${theme.theme}-${theme.confidence}`} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">
                  {formatThemeLabel(theme.theme)} {formatConfidence(theme.confidence)}
                </span>
              )) : <span className="text-sm text-slate-600">No themes detected.</span>}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-slate-500">Task 4 entity extraction</h3>
            <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {entityGroups.map((group) => {
                const values = task345Insights.entities[group] || [];
                return (
                  <div key={group}>
                    <span className="block text-xs font-semibold uppercase text-slate-500">{formatEntityGroup(group)}</span>
                    {values.length ? values.join(', ') : 'None found'}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-slate-500">Task 5 keyword extraction</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {task345Insights.keywords.length ? task345Insights.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">{keyword}</span>
              )) : <span className="text-sm text-slate-600">None found</span>}
            </div>
          </section>
        </div>
      ) : null}

      <ExpandIconButton
        label="ML Pipeline"
        open={open}
        onClick={() => setOpen((value) => !value)}
      />
    </section>
  );
}

function ExpandIconButton({ label, open, onClick }) {
  return (
    <button
      type="button"
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      onClick={onClick}
      className="absolute bottom-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <span className={`block h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-current transition-transform ${open ? 'rotate-[225deg]' : ''}`} />
    </button>
  );
}

function splitPreviewText(text, collapsedChars) {
  const cleanText = String(text || '').trim();
  if (!cleanText || cleanText.length <= collapsedChars) {
    return { preview: cleanText, rest: '', hasOverflow: false };
  }

  let previewEnd = cleanText.lastIndexOf(' ', collapsedChars);
  if (previewEnd < collapsedChars * 0.6) previewEnd = collapsedChars;

  return {
    preview: cleanText.slice(0, previewEnd).trimEnd(),
    rest: cleanText.slice(previewEnd),
    hasOverflow: true,
  };
}

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

function countEntities(entities) {
  if (!entities) return 0;
  return entityGroups.reduce((total, group) => total + (entities[group]?.length || 0), 0);
}

function formatStatusLabelLoose(status) {
  return String(status || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 'not available';
  return score.toFixed(2);
}

function formatThemeLabel(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEntityGroup(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
