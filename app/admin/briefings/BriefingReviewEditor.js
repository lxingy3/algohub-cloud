'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Save, Send, X } from 'lucide-react';

export function BriefingReviewEditor({ briefing }) {
  const [fields, setFields] = useState({
    title: briefing.title,
    executiveSummary: briefing.executiveSummary || '',
    patternAnalysis: briefing.patternAnalysis || '',
    keyFindings: jsonLines(briefing.keyFindings),
    recommendations: jsonLines(briefing.recommendations),
  });
  const [status, setStatus] = useState(briefing.reviewStatus);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState('');
  const [result, setResult] = useState(null);

  const update = (name) => (event) => setFields((current) => ({ ...current, [name]: event.target.value }));

  async function submit(action) {
    setSaving(action);
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
    formData.set('action', action);
    try {
      const response = await fetch(`/api/admin/briefings/${briefing.id}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'The briefing could not be saved.');
      setStatus(body.reviewStatus);
      setResult(body);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setSaving('');
    }
  }

  return (
    <article className="rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">{fields.title}</h2>
            <span className={statusClass(status)}>{status}</span>
            {briefing.generatedBy ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Source: {briefing.generatedBy}</span> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {briefing.briefingType} - {briefing.targetAlgorithmName || 'Cross-cutting corpus'} - {briefing.testimonyCount ?? 0} stories
            {briefing.reviewedByLabel ? ` - reviewed by ${briefing.reviewedByLabel}` : ''}
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{previewText(fields.executiveSummary)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {status === 'PUBLISHED' ? (
            <a href={briefing.previewUrl} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Eye className="h-4 w-4" /> View page
            </a>
          ) : null}
          <button type="button" onClick={() => setEditing((value) => !value)} className="min-h-10 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            {editing ? 'Close editor' : 'Review briefing'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="grid border-t border-slate-200 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <section className="grid gap-4 p-4 lg:border-r lg:p-5">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
              Review the wording below. Story counts, clusters, themes, and chart data are read from the current database and are not changed here.
            </div>
            <Field name="title" label="Title" value={fields.title} onChange={update('title')} />
            <TextArea name="executiveSummary" label="Executive summary" hint="Shown at the top of the briefing." value={fields.executiveSummary} onChange={update('executiveSummary')} rows={4} />
            <TextArea name="patternAnalysis" label="Pattern analysis" hint="Explain the main pattern without claiming more than the evidence supports." value={fields.patternAnalysis} onChange={update('patternAnalysis')} rows={4} />
            <TextArea name="keyFindings" label="Key findings" hint="One finding per line." value={fields.keyFindings} onChange={update('keyFindings')} rows={5} />
            <TextArea name="recommendations" label="Recommendations" hint="One recommendation per line." value={fields.recommendations} onChange={update('recommendations')} rows={5} />
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <ActionButton icon={Save} label="Save draft" action="save" saving={saving} onClick={submit} />
              <ActionButton icon={CheckCircle2} label="Mark reviewed" action="review" saving={saving} onClick={submit} />
              <ActionButton icon={Send} label="Publish" action="publish" saving={saving} onClick={submit} primary />
            </div>
          </section>
          <BriefingPreview fields={fields} />
        </div>
      ) : null}

      <SaveResultModal result={result} onClose={() => setResult(null)} />
    </article>
  );
}

function BriefingPreview({ fields }) {
  const findings = lines(fields.keyFindings);
  const recommendations = lines(fields.recommendations);
  return (
    <aside className="bg-slate-50 p-4 lg:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Public-page preview</p>
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-bold text-slate-950">{fields.title || 'Untitled briefing'}</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{fields.executiveSummary || 'No executive summary yet.'}</p>
        {fields.patternAnalysis ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">{fields.patternAnalysis}</p> : null}
        <PreviewList title="Key findings" rows={findings} />
        <PreviewList title="Recommendations" rows={recommendations} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">This preview shows the reviewed text only. Charts continue to use the saved corpus results.</p>
    </aside>
  );
}

function PreviewList({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {rows.map((row, index) => <li key={`${title}-${index}`} className="border-l-2 border-emerald-500 pl-3">{row}</li>)}
      </ul>
    </section>
  );
}

function ActionButton({ icon: Icon, label, action, saving, onClick, primary = false }) {
  const busy = Boolean(saving);
  return (
    <button type="button" disabled={busy} onClick={() => onClick(action)} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${primary ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
      <Icon className="h-4 w-4" /> {saving === action ? 'Saving...' : label}
    </button>
  );
}

function SaveResultModal({ result, onClose }) {
  useEffect(() => {
    if (!result) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [result]);
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${result.error ? 'text-red-700' : 'text-emerald-700'}`}>{result.error ? 'Save failed' : 'Briefing updated'}</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">{result.error || result.message}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close update result"><X className="h-5 w-5" /></button>
        </div>
        {!result.error ? (
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
            <StatusRow label="Database" value="Updated now" />
            <StatusRow label="Public page" value={result.publicPage} />
            <StatusRow label="ML refresh" value={result.mlRefresh} />
          </div>
        ) : null}
        <button type="button" onClick={onClose} className="mt-5 min-h-10 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Done</button>
      </div>
    </div>
  );
}

function StatusRow({ label, value }) {
  return <div className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[110px_1fr]"><span className="font-semibold text-slate-500">{label}</span><span>{value}</span></div>;
}

function Field({ name, label, value, onChange }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input name={name} value={value} onChange={onChange} className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900" /></label>;
}

function TextArea({ name, label, hint, value, onChange, rows }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<span className="ml-2 font-normal text-slate-500">{hint}</span><textarea name={name} value={value} onChange={onChange} rows={rows} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal leading-6 text-slate-900" /></label>;
}

function jsonLines(value) {
  return (Array.isArray(value) ? value : []).map((item) => typeof item === 'string' ? item : item?.text || '').filter(Boolean).join('\n');
}

function lines(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function previewText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No summary text yet.';
  return text.length > 260 ? `${text.slice(0, 260).trim()}...` : text;
}

function statusClass(status) {
  const tone = status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : status === 'REVIEWED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900';
  return `rounded-full px-2 py-1 text-xs font-semibold ${tone}`;
}
