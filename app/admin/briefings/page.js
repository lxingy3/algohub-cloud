import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { BriefingReviewEditor } from './BriefingReviewEditor';
import { PartnerReviewGateEditor } from './PartnerReviewGateEditor';

export const dynamic = 'force-dynamic';

export default async function AdminBriefingsPage({ searchParams }) {
  const params = await searchParams;
  const status = ['DRAFT', 'PUBLISHED', 'REVIEWED'].includes(String(params?.status || '').toUpperCase())
    ? String(params.status).toUpperCase()
    : '';
  const search = String(params?.search || '').trim();
  const jurisdictionId = getJurisdictionId();
  const defaultPartnerDeadline = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
  const [briefings, statusCounts, algorithms, generationJobs, organizations] = await Promise.all([
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
        partnerReviewOverriddenBy: { select: { name: true, email: true } },
        partnerReviews: {
          orderBy: { deadline: 'asc' },
          include: {
          organization: { select: { id: true, name: true, slug: true, isActive: true } },
            assignedBy: { select: { name: true, email: true } },
            reviewedBy: { select: { name: true, email: true } },
          },
        },
        reviewNotes: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } } },
      },
    }),
    prisma.briefing.groupBy({
      by: ['reviewStatus'],
      where: { jurisdictionId },
      _count: { reviewStatus: true },
    }),
    prisma.algorithm.findMany({ where: { jurisdictionId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.briefingGenerationJob.findMany({
      where: { jurisdictionId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { targetAlgorithm: { select: { name: true } }, requestedBy: { select: { name: true, email: true } } },
    }),
    prisma.organization.findMany({
      where: { jurisdictionId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
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
      <section className="mt-5 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Generate briefing draft</h2>
        <p className="mt-1 text-sm text-slate-600">This queues an offline job. Run <code>npm run briefings:jobs</code> on the local worker until Google Cloud takes over.</p>
        <form action="/api/admin/briefings/generate" method="post" className="mt-4 grid gap-3 md:grid-cols-[190px_1fr_auto]">
          <select name="briefingType" className="min-h-11 rounded-md border bg-white px-3 py-2">
            <option value="CROSS_CUTTING">Cross-cutting corpus</option>
            <option value="ALGORITHM_SPECIFIC">Specific algorithm</option>
          </select>
          <select name="targetAlgorithmId" className="min-h-11 rounded-md border bg-white px-3 py-2">
            <option value="">Choose an algorithm when needed</option>
            {algorithms.map((algorithm) => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}
          </select>
          <button className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Queue draft</button>
        </form>
        {generationJobs.length ? <div className="mt-4 grid gap-2">
          {generationJobs.map((job) => <div key={job.id} className="grid gap-1 rounded-md border bg-slate-50 p-3 text-sm md:grid-cols-[120px_1fr_1fr]">
            <strong>{job.status}</strong><span>{job.targetAlgorithm?.name || 'Cross-cutting corpus'}</span><span className="text-slate-600">{job.message || 'Queued'} - {job.requestedBy.name || job.requestedBy.email}</span>
          </div>)}
        </div> : null}
      </section>
      <p className="mt-3 text-sm text-slate-500">Showing {briefings.length} briefing{briefings.length === 1 ? '' : 's'}</p>

      <div className="mt-6 space-y-4">
        {briefings.map((briefing) => <div key={briefing.id}>
          <BriefingReviewEditor briefing={serializeBriefing(briefing)} />
          <PartnerReviewGateEditor initialGate={serializePartnerGate(briefing)} organizations={organizations} defaultDeadline={defaultPartnerDeadline} />
        </div>)}
        {!briefings.length ? <p className="rounded-lg border bg-white p-4 text-sm text-slate-600">No briefings match this filter.</p> : null}
      </div>
    </div>
  );
}

function serializeBriefing(briefing) {
  const algorithm = briefing.targetAlgorithm;
  return {
    id: briefing.id,
    slug: briefing.slug,
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
    reviewedAt: briefing.reviewedAt?.toISOString() || null,
    previewUrl: `/briefings/${briefing.slug}`,
    partnerReviewUrl: `/briefings/review/${briefing.slug}`,
    reviewNotes: briefing.reviewNotes.map((note) => ({
      id: note.id,
      content: note.content,
      author: note.user.name || note.user.email,
      organization: note.organization?.name || null,
      createdAt: note.createdAt.toISOString(),
    })),
  };
}

function serializePartnerGate(briefing) {
  return {
    briefing: {
      id: briefing.id,
      slug: briefing.slug,
      title: briefing.title,
      reviewStatus: briefing.reviewStatus,
    },
    assignments: briefing.partnerReviews.map((assignment) => ({
      id: assignment.id,
      organization: assignment.organization,
      status: assignment.status,
      deadline: assignment.deadline.toISOString(),
      assignedAt: assignment.assignedAt.toISOString(),
      assignedBy: assignment.assignedBy,
      reviewedAt: assignment.reviewedAt?.toISOString() || null,
      reviewedBy: assignment.reviewedBy,
    })),
    override: briefing.partnerReviewOverriddenAt ? {
      reason: briefing.partnerReviewOverrideReason,
      at: briefing.partnerReviewOverriddenAt.toISOString(),
      by: briefing.partnerReviewOverriddenBy,
    } : null,
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
