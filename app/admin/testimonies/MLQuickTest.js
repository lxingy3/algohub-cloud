'use client';

import { useState } from 'react';

export default function MLQuickTest() {
  const [narrativeText, setNarrativeText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function runQuickTest(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/ml/quick-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ narrativeText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Quick test failed.');
      setResult(payload.result);
    } catch (quickTestError) {
      setError(quickTestError.message || 'Quick test failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">ML Quick Test</h2>
      </div>
      <form onSubmit={runQuickTest} className="mt-3 space-y-3">
        <textarea
          value={narrativeText}
          onChange={(event) => setNarrativeText(event.target.value)}
          name="narrative_text"
          rows={5}
          placeholder="Paste narrative_text..."
          className="w-full rounded-md border px-3 py-2 text-sm leading-6"
        />
        <button
          type="submit"
          disabled={isLoading || !narrativeText.trim()}
          className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? 'Running...' : 'Run ML test'}
        </button>
      </form>
      {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {result ? <QuickTestResult result={result} /> : null}
    </section>
  );
}

function QuickTestResult({ result }) {
  const task2 = result.task2 || {};
  const task3 = result.task3 || {};
  const task4 = result.task4 || {};
  const task5 = result.task5 || {};
  const entities = task4.entities || {};

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 1 transcription</p>
        <p className="mt-1 text-sm text-slate-700">Skipped for text input.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 2 impact classification</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">{task2.aiImpactClassification}</span>
          <span className="text-slate-600">confidence {formatScore(task2.aiConfidenceScore)}</span>
          {task2.humanReviewRequired ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Needs review</span> : null}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 3 theme detection</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(task3.aiThemes || []).map((theme) => (
            <span key={theme.theme} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
              {formatLabel(theme.theme)} {formatScore(theme.confidence)}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 4 entity extraction</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          {Object.entries(entities).map(([group, values]) => (
            <div key={group}>
              <span className="block text-xs font-semibold uppercase text-slate-500">{formatLabel(group)}</span>
              <span>{values.length ? values.join(', ') : 'None found'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 5 keyword extraction</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(task5.keywords || []).length ? task5.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{keyword}</span>
          )) : <span className="text-sm text-slate-600">None found</span>}
        </div>
      </div>
    </div>
  );
}

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(2) : 'not available';
}

function formatLabel(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
