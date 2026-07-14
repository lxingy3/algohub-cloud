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
        <p className="mt-2 text-sm leading-6 text-slate-800">
          {preview}
          {hasOverflow && !open ? '...' : ''}
          {hasOverflow && open ? rest : ''}
        </p>
      </button>
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

export function MLPipelinePanel({ result }) {
  const [open, setOpen] = useState(false);
  const pipelinePreview = buildPipelinePreview(result);

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
        <div className="mt-3 border-t border-slate-100 pt-3">
          <MLTaskResults result={result} />
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

export function MLTaskResults({ result, showTechnicalDetails = false }) {
  const task1 = result?.task1;
  const task2 = result?.task2;
  const task3 = result?.task3;
  const task4 = result?.task4;
  const task5 = result?.task5;
  const [showOriginalTask1, setShowOriginalTask1] = useState(false);
  const task1HasOriginal = Boolean(task1?.originalTranscript);
  const displayedTask1Transcript = showOriginalTask1 && task1HasOriginal
    ? task1.originalTranscript
    : task1?.transcript || task1?.rawTranscript;
  const displayedTask1Segments = showOriginalTask1 && task1HasOriginal
    ? task1.originalSegments || []
    : task1?.segments || [];
  const hasTask1TechnicalDetails = showTechnicalDetails && Boolean(
    task1?.tool
    || task1?.inputFile
    || task1?.compressedForQuickTest
    || displayedTask1Segments.length,
  );

  return (
    <div className="space-y-3">
      {task1 ? (
        <TaskSection title="Task 1 transcription" task={task1} muted>
          {task1.status === 'COMPLETED' ? (
            <div className="mt-2 space-y-3">
              {task1.translatedToEnglish ? (
                <div className="flex justify-end rounded-md border border-blue-100 bg-blue-50 p-2">
                  <button
                    type="button"
                    onClick={() => setShowOriginalTask1((current) => !current)}
                    className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                  >
                    {showOriginalTask1 ? 'Show English translation' : 'Show original transcript'}
                  </button>
                </div>
              ) : null}
              {displayedTask1Transcript ? (
                <p className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-white p-3 text-sm leading-6 text-slate-800">{displayedTask1Transcript}</p>
              ) : <p className="text-sm text-slate-600">No transcript returned.</p>}
              {hasTask1TechnicalDetails ? (
                <details className="rounded-md border bg-white p-3 text-sm text-slate-700">
                  <summary className="cursor-pointer font-semibold">Technical details</summary>
                  <div className="mt-3 space-y-3">
                    {task1.tool ? <p>Model: {task1.tool}</p> : null}
                    {task1.inputFile ? <p>Input file: {task1.inputFile}</p> : null}
                    {task1.compressedForQuickTest ? <p className="text-amber-900">Audio was compressed for this Quick Test run before transcription.</p> : null}
                    {displayedTask1Segments.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {displayedTask1Segments.map((segment, index) => (
                          <div key={`${segment.start}-${segment.end}-${index}`} className="rounded-md border p-2">
                            <p className="text-xs font-semibold text-slate-500">{formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}</p>
                            <p className="mt-1 text-slate-800">{segment.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          ) : <TaskState task={task1} />}
        </TaskSection>
      ) : null}

      {task2 ? (
        <TaskSection title="Task 2 impact classification" task={task2}>
          {task2.status === 'COMPLETED' && task2.aiImpactClassification ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">{task2.aiImpactClassification}</span>
              <span className="text-slate-600">confidence {formatConfidence(task2.aiConfidenceScore)}</span>
              {needsImpactReview(task2) ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Needs review</span> : null}
            </div>
          ) : <TaskState task={task2} />}
        </TaskSection>
      ) : null}

      {task3 ? (
        <TaskSection title="Task 3 theme detection" task={task3}>
          {task3.status === 'COMPLETED' ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(task3.aiThemes || []).length ? task3.aiThemes.map((theme) => {
                const confidence = numberOrNull(theme.confidence);
                const suggested = theme.label === 'suggested' || confidence === null || confidence < 0.75;
                return (
                  <span key={`${theme.theme}-${theme.confidence}`} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                    {formatThemeLabel(theme.theme)} {formatConfidence(theme.confidence)}{suggested ? ' · Suggested' : ''}
                  </span>
                );
              }) : <span className="text-sm text-slate-600">No themes detected.</span>}
            </div>
          ) : <TaskState task={task3} />}
        </TaskSection>
      ) : null}

      {task4 ? (
        <TaskSection title="Task 4 entity extraction" task={task4}>
          {task4.status === 'COMPLETED' ? (
            <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {entityGroups.map((group) => {
                const values = Array.isArray(task4.entities?.[group]) ? task4.entities[group] : [];
                return (
                  <div key={group}>
                    <span className="block text-xs font-semibold uppercase text-slate-500">{formatEntityGroup(group)}</span>
                    {values.length ? values.join(', ') : 'None found'}
                  </div>
                );
              })}
            </div>
          ) : <TaskState task={task4} />}
        </TaskSection>
      ) : null}

      {task5 ? (
        <TaskSection title="Task 5 keyword extraction" task={task5}>
          {task5.status === 'COMPLETED' ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {(task5.keywords || []).length ? task5.keywords.slice(0, 10).map((keyword) => (
                <span key={keyword} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{keyword}</span>
              )) : <span className="text-sm text-slate-600">None found</span>}
            </div>
          ) : <TaskState task={task5} />}
        </TaskSection>
      ) : null}
    </div>
  );
}

function TaskSection({ title, task, muted = false, children }) {
  return (
    <section className={`rounded-md border border-slate-200 p-3 ${muted ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-700">{formatStatusLabelLoose(task.status || 'NOT_RUN')}</span>
      </div>
      {children}
    </section>
  );
}

function TaskState({ task }) {
  const message = task.error || task.reason || statusMessage(task.status);
  return <p className={`mt-2 text-sm ${task.error ? 'text-amber-900' : 'text-slate-600'}`}>{message}</p>;
}

function ExpandIconButton({ label, open, onClick }) {
  return (
    <button
      type="button"
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      onClick={onClick}
      className="absolute bottom-1 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <span className={`block h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-current transition-transform ${open ? 'rotate-[225deg]' : ''}`} />
    </button>
  );
}

function splitPreviewText(text, collapsedChars) {
  const cleanText = normalizeInlineText(text);
  if (!cleanText || cleanText.length <= collapsedChars) {
    return { preview: cleanText, rest: '', hasOverflow: false };
  }

  const previewEnd = findPreviewSentenceEnd(cleanText, collapsedChars);

  return {
    preview: cleanText.slice(0, previewEnd).trim(),
    rest: ` ${cleanText.slice(previewEnd).trimStart()}`,
    hasOverflow: true,
  };
}

function normalizeInlineText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function findPreviewSentenceEnd(text, collapsedChars) {
  const sentenceEnds = [...text.matchAll(/[.!?](?=\s|$)/g)].map((match) => match.index + 1);
  const beforeLimit = sentenceEnds.filter((index) => index <= collapsedChars);
  const afterMinimum = beforeLimit.filter((index) => index >= collapsedChars * 0.55);
  if (afterMinimum.length) return afterMinimum[afterMinimum.length - 1];

  const firstAfterLimit = sentenceEnds.find((index) => index > collapsedChars);
  if (firstAfterLimit && firstAfterLimit <= collapsedChars * 1.35) return firstAfterLimit;

  const wordEnd = text.lastIndexOf(' ', collapsedChars);
  return wordEnd > 0 ? wordEnd : collapsedChars;
}

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

function buildPipelinePreview(result) {
  const task1 = result?.task1 || { status: 'NOT_RUN' };
  const task2 = result?.task2 || { status: 'NOT_RUN' };
  const task3 = result?.task3 || { status: 'NOT_RUN' };
  const task4 = result?.task4 || { status: 'NOT_RUN' };
  const task5 = result?.task5 || { status: 'NOT_RUN' };
  const task2Summary = task2.status === 'COMPLETED' && task2.aiImpactClassification
    ? `${task2.aiImpactClassification} (${formatConfidence(task2.aiConfidenceScore)})`
    : formatStatusLabelLoose(task2.status);
  const task3Summary = task3.status === 'COMPLETED'
    ? `${task3.aiThemes?.length || 0} theme${task3.aiThemes?.length === 1 ? '' : 's'}`
    : formatStatusLabelLoose(task3.status);
  const entityCount = countEntities(task4.entities);
  const task4Summary = task4.status === 'COMPLETED'
    ? `${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}`
    : formatStatusLabelLoose(task4.status);
  const task5Summary = task5.status === 'COMPLETED'
    ? `${task5.keywords?.length || 0} keyword${task5.keywords?.length === 1 ? '' : 's'}`
    : formatStatusLabelLoose(task5.status);

  return [
    `Task 1 ${formatStatusLabelLoose(task1.status)}`,
    `Task 2 ${task2Summary}`,
    `Task 3 ${task3Summary}`,
    `Task 4 ${task4Summary}`,
    `Task 5 ${task5Summary}`,
  ].join(' | ');
}

function countEntities(entities) {
  if (!entities) return 0;
  return entityGroups.reduce((total, group) => total + (entities[group]?.length || 0), 0);
}

function needsImpactReview(task) {
  const confidence = numberOrNull(task.aiConfidenceScore);
  if (confidence === null) return true;
  if (typeof task.humanReviewRequired === 'boolean') return task.humanReviewRequired;
  return confidence <= 0.85;
}

function statusMessage(status) {
  if (status === 'PENDING') return 'Waiting for processing.';
  if (status === 'FAILED') return 'Processing failed.';
  if (status === 'DEFERRED') return 'Processing was deferred.';
  if (status === 'SKIPPED') return 'Skipped.';
  return 'No stored result.';
}

function formatStatusLabelLoose(status) {
  return String(status || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(value) {
  const score = numberOrNull(value);
  if (score === null) return 'not available';
  return score.toFixed(2);
}

function formatThemeLabel(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEntityGroup(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}s` : '--';
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
