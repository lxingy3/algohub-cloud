import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { BriefingReviewEditor } from './BriefingReviewEditor';

export const dynamic = 'force-dynamic';

export default async function AdminBriefingsPage({ searchParams }) {
  const params = await searchParams;
  const status = ['DRAFT', 'PUBLISHED', 'REVIEWED'].includes(String(params?.status || '').toUpperCase())
    ? String(params.status).toUpperCase()
    : '';
  const search = String(params?.search || '').trim();
  const jurisdictionId = getJurisdictionId();
  const [briefings, statusCounts] = await Promise.all([
    prisma.briefing.findMany({
      where: {
        jurisdictionId,
        ...(status ? { reviewStatus: status } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { targetAlgorithm: { is: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        } : {}),
      },
      orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
      include: {
        targetAlgorithm: { select: { name: true, slug: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.briefing.groupBy({
      by: ['reviewStatus'],
      where: { jurisdictionId },
      _count: { reviewStatus: true },
    }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((item) => [item.reviewStatus, item._count.reviewStatus]));
  const allCount = statusCounts.reduce((total, item) => total + item._count.reviewStatus, 0);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Briefing Review</h1>
          <p className="mt-1 text-sm text-slate-600">Review cached briefing drafts before publishing them to the public page.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={briefingFilterHref('', search)} className={tabClass(!status)}>All ({allCount})</a>
          <a href={briefingFilterHref('DRAFT', search)} className={tabClass(status === 'DRAFT')}>Draft ({counts.DRAFT || 0})</a>
          <a href={briefingFilterHref('REVIEWED', search)} className={tabClass(status === 'REVIEWED')}>Reviewed ({counts.REVIEWED || 0})</a>
          <a href={briefingFilterHref('PUBLISHED', search)} className={tabClass(status === 'PUBLISHED')}>Published ({counts.PUBLISHED || 0})</a>
        </div>
      </div>

      <form className="mt-5 flex flex-col gap-2 rounded-lg border bg-white p-4 sm:flex-row">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input name="search" defaultValue={search} placeholder="Search title or target algorithm" className="min-h-11 flex-1 rounded-md border px-3 py-2" />
        <button className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Find</button>
        {search ? <a href={briefingFilterHref(status, '')} className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold">Clear</a> : null}
      </form>
      <p className="mt-3 text-sm text-slate-500">Showing {briefings.length} briefing{briefings.length === 1 ? '' : 's'}</p>

      <div className="mt-6 space-y-4">
        {briefings.map((briefing) => <BriefingReviewEditor key={briefing.id} briefing={serializeBriefing(briefing)} />)}
        {!briefings.length ? <p className="rounded-lg border bg-white p-4 text-sm text-slate-600">No briefings match this filter.</p> : null}
      </div>
    </div>
  );
}

function serializeBriefing(briefing) {
  const algorithm = briefing.targetAlgorithm;
  return {
    id: briefing.id,
    title: briefing.title,
    briefingType: briefing.briefingType,
    testimonyCount: briefing.testimonyCount,
    executiveSummary: briefing.executiveSummary,
    patternAnalysis: briefing.patternAnalysis,
    keyFindings: briefing.keyFindings,
    recommendations: briefing.recommendations,
    generatedBy: briefing.generatedBy,
    reviewStatus: briefing.reviewStatus,
    targetAlgorithmName: algorithm?.name || null,
    reviewedByLabel: briefing.reviewedBy?.name || briefing.reviewedBy?.email || null,
    previewUrl: `/briefings?scope=${algorithm ? 'algorithm' : 'overview'}${algorithm ? `&algorithm=${algorithm.slug}` : ''}`,
  };
}

function tabClass(active) {
  return `rounded-md px-3 py-2 font-semibold ${active ? 'bg-slate-900 text-white' : 'border bg-white text-slate-700 hover:bg-slate-50'}`;
}

function briefingFilterHref(status, search) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString();
  return `/admin/briefings${query ? `?${query}` : ''}`;
}
