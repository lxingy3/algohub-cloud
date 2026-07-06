import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminBriefingsPage({ searchParams }) {
  const params = await searchParams;
  const status = ['DRAFT', 'PUBLISHED', 'REVIEWED'].includes(String(params?.status || '').toUpperCase())
    ? String(params.status).toUpperCase()
    : '';
  const jurisdictionId = getJurisdictionId();
  const briefings = await prisma.briefing.findMany({
    where: { jurisdictionId, ...(status ? { reviewStatus: status } : {}) },
    orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
    include: {
      targetAlgorithm: { select: { name: true, slug: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Briefing Review</h1>
          <p className="mt-1 text-sm text-slate-600">Review cached briefing drafts before publishing them to the public page.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/admin/briefings" className={tabClass(!status)}>All</a>
          <a href="/admin/briefings?status=DRAFT" className={tabClass(status === 'DRAFT')}>Draft</a>
          <a href="/admin/briefings?status=PUBLISHED" className={tabClass(status === 'PUBLISHED')}>Published</a>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {briefings.map((briefing) => (
          <article key={briefing.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-950">{briefing.title}</h2>
                  <span className={statusClass(briefing.reviewStatus)}>{briefing.reviewStatus}</span>
                  {briefing.generatedBy ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{briefing.generatedBy}</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {briefing.briefingType} - {briefing.targetAlgorithm?.name || 'Cross-cutting corpus'} - {briefing.testimonyCount ?? 0} stories
                  {briefing.reviewedBy ? ` - reviewed by ${briefing.reviewedBy.name || briefing.reviewedBy.email}` : ''}
                </p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{previewText(briefing.executiveSummary)}</p>
              </div>
              {briefing.reviewStatus === 'PUBLISHED' ? (
                <a href={`/briefings?scope=${briefing.targetAlgorithm ? 'algorithm' : 'overview'}${briefing.targetAlgorithm ? `&algorithm=${briefing.targetAlgorithm.slug}` : ''}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  View page
                </a>
              ) : null}
            </div>

            <details className="mt-4 rounded-md border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Edit briefing text</summary>
              <form action={`/api/admin/briefings/${briefing.id}`} method="post" className="grid gap-3 border-t border-slate-200 bg-white p-4">
                <Field name="title" label="Title" defaultValue={briefing.title} />
                <TextArea name="executiveSummary" label="Executive summary" defaultValue={briefing.executiveSummary || ''} rows={3} />
                <TextArea name="patternAnalysis" label="Pattern analysis" defaultValue={briefing.patternAnalysis || ''} rows={3} />
                <TextArea name="keyFindings" label="Key findings, one per line" defaultValue={jsonLines(briefing.keyFindings)} rows={4} />
                <TextArea name="recommendations" label="Recommendations, one per line" defaultValue={jsonLines(briefing.recommendations)} rows={4} />
                <div className="flex flex-wrap gap-2">
                  <button name="action" value="save" className="min-h-10 rounded-md border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save draft</button>
                  <button name="action" value="publish" className="min-h-10 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Publish</button>
                </div>
              </form>
            </details>
          </article>
        ))}
        {!briefings.length ? <p className="rounded-lg border bg-white p-4 text-sm text-slate-600">No briefings match this filter.</p> : null}
      </div>
    </div>
  );
}

function Field({ name, label, defaultValue }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input name={name} defaultValue={defaultValue} className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900" />
    </label>
  );
}

function TextArea({ name, label, defaultValue, rows }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <textarea name={name} defaultValue={defaultValue} rows={rows} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal leading-6 text-slate-900" />
    </label>
  );
}

function jsonLines(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((item) => typeof item === 'string' ? item : item?.text || '').filter(Boolean).join('\n');
}

function previewText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No summary text yet.';
  return text.length > 260 ? `${text.slice(0, 260).trim()}...` : text;
}

function tabClass(active) {
  return `rounded-md px-3 py-2 font-semibold ${active ? 'bg-slate-900 text-white' : 'border bg-white text-slate-700 hover:bg-slate-50'}`;
}

function statusClass(status) {
  const tone = status === 'PUBLISHED'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'REVIEWED'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-amber-100 text-amber-900';
  return `rounded-full px-2 py-1 text-xs font-semibold ${tone}`;
}
