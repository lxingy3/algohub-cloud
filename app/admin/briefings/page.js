import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { BriefingReviewEditor } from './BriefingReviewEditor';

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
          <a href="/admin/briefings?status=REVIEWED" className={tabClass(status === 'REVIEWED')}>Reviewed</a>
          <a href="/admin/briefings?status=PUBLISHED" className={tabClass(status === 'PUBLISHED')}>Published</a>
        </div>
      </div>

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
