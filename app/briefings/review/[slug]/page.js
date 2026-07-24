import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '../../../../lib/auth';
import { canAccessPartnerReview, canChangePartnerDecision } from '../../../../lib/briefingPartnerReview';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { SiteNav } from '../../../components/SiteNav';

export const dynamic = 'force-dynamic';

export default async function PartnerBriefingReviewPage({ params, searchParams }) {
  const user = await getCurrentUser();
  const { slug } = await params;
  const roles = new Set(user?.userRoles.map(({ role }) => role.name) || []);
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/briefings/review/${slug}`)}`);
  if (![...roles].some((role) => ['ADMIN', 'FACILITATOR', 'ORG_MEMBER'].includes(role))) notFound();
  const isAdmin = roles.has('ADMIN');
  if (!isAdmin && !user.organizationId) notFound();
  const briefing = await prisma.briefing.findFirst({
    where: {
      jurisdictionId: getJurisdictionId(),
      slug,
      ...(isAdmin ? {} : { partnerReviews: { some: { organizationId: user.organizationId, organization: { isActive: true } } } }),
    },
    include: {
      targetAlgorithm: { select: { name: true } },
      partnerReviews: {
        where: isAdmin ? {} : { organizationId: user.organizationId, organization: { isActive: true } },
        orderBy: { deadline: 'asc' },
        include: {
          organization: { select: { name: true } },
          reviewedBy: { select: { name: true, email: true } },
        },
      },
      reviewNotes: {
        where: isAdmin ? {} : user.organizationId ? { organizationId: user.organizationId } : { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } },
      },
    },
  });
  if (!briefing) notFound();
  const assignment = briefing.partnerReviews[0];
  if (!isAdmin && !canAccessPartnerReview(user, assignment?.organizationId)) notFound();
  const query = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <SiteNav currentUser={user} />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Partner draft review</p>
        <div className="mt-3 rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{briefing.title}</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{briefing.reviewStatus}</span></div>
          <p className="mt-2 text-sm text-slate-500">{briefing.targetAlgorithm?.name || 'Cross-cutting corpus'} - {briefing.testimonyCount || 0} approved stories</p>
          <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-800">{briefing.executiveSummary || 'No executive summary yet.'}</p>
          {briefing.patternAnalysis ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 leading-7 text-amber-950">{briefing.patternAnalysis}</p> : null}
          <ReviewList title="Key findings" rows={briefing.keyFindings} />
          <ReviewList title="Recommendations" rows={briefing.recommendations} />
        </div>
        <section className="mt-5 grid gap-3">
          {briefing.partnerReviews.map((review) => <article key={review.id} className="rounded-lg border bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{review.organization.name}</strong><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{review.status}</span></div>
            <p className="mt-2 text-slate-600">Deadline: {review.deadline.toLocaleString()} {review.reviewedBy ? `- reviewed by ${review.reviewedBy.name || review.reviewedBy.email}` : ''}</p>
          </article>)}
        </section>
        {!canChangePartnerDecision(briefing.reviewStatus) ? <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">This briefing is published, so partner decisions are read-only. An admin must move it back to review before a partner can change the decision.</p> : !isAdmin ? <form action={`/api/briefings/${slug}/review-notes`} method="post" className="mt-5 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-bold">Submit your organization review</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a decision and explain it. The decision and note are visible to admins and reviewers from your organization.</p>
          <select name="status" required defaultValue="" className="mt-4 min-h-11 w-full rounded-md border bg-white px-3 py-2">
            <option value="" disabled>Select a decision</option>
            <option value="APPROVED">Approve</option>
            <option value="CONCERN">Raise concern</option>
            <option value="REVISION_REQUESTED">Request revision</option>
          </select>
          <textarea name="content" minLength={10} maxLength={4000} required className="mt-3 min-h-36 w-full rounded-md border px-3 py-2" />
          <button className="mt-3 min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Submit review</button>
          {query?.saved ? <span className="ml-3 text-sm font-semibold text-emerald-700">Review saved as {query.status}.</span> : null}
        </form> : <p className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">Admins can view every assigned organization here. Partner decisions must be submitted by a reviewer in that organization.</p>}
        {briefing.reviewNotes.length ? <section className="mt-5"><h2 className="text-lg font-bold">Review history</h2><div className="mt-3 grid gap-3">{briefing.reviewNotes.map((note) => <article key={note.id} className="rounded-lg border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{note.user.name || note.user.email}{note.organization ? ` - ${note.organization.name}` : ''}</strong>{note.partnerReviewStatus ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{note.partnerReviewStatus}</span> : null}</div><p className="mt-2 whitespace-pre-wrap text-slate-700">{note.content}</p></article>)}</div></section> : null}
      </section>
    </main>
  );
}

function ReviewList({ title, rows }) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  return <section className="mt-5"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2><ul className="mt-2 space-y-2">{items.map((row, index) => <li key={`${title}-${index}`} className="border-l-2 border-emerald-600 pl-3">{typeof row === 'string' ? row : row?.text || ''}</li>)}</ul></section>;
}
