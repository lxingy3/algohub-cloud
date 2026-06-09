import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

function formatDate(value) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function fieldValue(value) {
  return value || 'Not provided';
}

const statusOrder = { PENDING: 0, FLAGGED: 1, REJECTED: 2, APPROVED: 3 };
const allowedStatuses = new Set(['PENDING', 'FLAGGED', 'REJECTED', 'APPROVED']);

export default async function AdminTestimoniesPage({ searchParams }) {
  const params = await searchParams;
  const statusFilter = String(params?.status || '').toUpperCase();
  const where = {
    jurisdictionId: getJurisdictionId(),
    ...(allowedStatuses.has(statusFilter) ? { moderationStatus: statusFilter } : {}),
  };
  const testimonies = await prisma.testimony.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      submitterName: true,
      submitterEmail: true,
      storyType: true,
      audioFileUrl: true,
      videoFileUrl: true,
      moderationStatus: true,
      city: true,
      zipCode: true,
      referralSource: true,
      narrativeText: true,
      publicPosting: true,
      followupConsent: true,
      selfReportedImpact: true,
      moderationNotes: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
      partnerOrganization: { select: { name: true } },
      algorithmLinks: { select: { algorithmId: true, algorithm: { select: { name: true } } } },
    },
  });
  testimonies.sort((a, b) => (statusOrder[a.moderationStatus] ?? 9) - (statusOrder[b.moderationStatus] ?? 9) || b.submittedAt - a.submittedAt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{statusFilter === 'PENDING' ? 'Pending Testimony Queue' : 'Testimony Queue'}</h1>
        {statusFilter ? (
          <a href="/admin/testimonies" className="inline-flex min-h-11 items-center rounded-md border bg-white px-3 py-2 text-sm">Show all</a>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {testimonies.map((testimony) => {
          const linkedAlgorithms = testimony.algorithmLinks.map((link) => link.algorithm?.name).filter(Boolean);
          const submitter = testimony.submitterName || testimony.user?.name || 'Anonymous';
          const submitterEmail = testimony.submitterEmail || testimony.user?.email || '';
          const storyType = testimony.storyType || 'text';
          const hasAudio = Boolean(testimony.audioFileUrl);
          const hasVideo = Boolean(testimony.videoFileUrl);

          return (
            <form key={testimony.id} action={`/api/admin/testimonies/${testimony.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
              {statusFilter ? <input type="hidden" name="returnTo" value={`/admin/testimonies?status=${statusFilter}`} /> : null}
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{testimony.title || 'Untitled testimony'}</h2>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium uppercase text-amber-800">{storyType}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Submitted by {submitter}{submitterEmail ? ` (${submitterEmail})` : ''} on {formatDate(testimony.submittedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{testimony.moderationStatus}</span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 lg:grid-cols-4">
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">City</span>
                  {fieldValue(testimony.city)}
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Zip Code</span>
                  {fieldValue(testimony.zipCode)}
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Algorithm</span>
                  {linkedAlgorithms.length ? linkedAlgorithms.join(', ') : 'Not selected'}
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Referral</span>
                  {fieldValue(testimony.referralSource || testimony.partnerOrganization?.name)}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Story details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{testimony.narrativeText}</p>
              </div>

              {hasAudio || hasVideo ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Uploaded media</p>
                  {hasAudio ? (
                    <audio className="mt-3 w-full" src={`/api/admin/testimonies/${testimony.id}/media/audio`} controls preload="metadata">
                      Your browser does not support audio playback.
                    </audio>
                  ) : null}
                  {hasVideo ? (
                    <video className="mt-3 max-h-96 w-full rounded-md border bg-black object-contain" src={`/api/admin/testimonies/${testimony.id}/media/video`} controls preload="metadata">
                      Your browser does not support video playback.
                    </video>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Public sharing</span>
                  {testimony.publicPosting ? 'Allowed' : 'Not allowed'}
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Follow-up consent</span>
                  {testimony.followupConsent ? 'Granted' : 'Not granted'}
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Impact</span>
                  {fieldValue(testimony.selfReportedImpact)}
                </div>
              </div>

              <textarea name="notes" placeholder="Moderation notes" defaultValue={testimony.moderationNotes || ''} className="mt-3 w-full rounded-md border px-3 py-2" />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button name="status" value="APPROVED" className="min-h-11 rounded-md border px-3 py-2 text-sm">Approve</button>
                <button name="status" value="FLAGGED" className="min-h-11 rounded-md border px-3 py-2 text-sm">Flag</button>
                <button name="status" value="REJECTED" className="min-h-11 rounded-md border px-3 py-2 text-sm text-red-700">Reject</button>
              </div>
            </form>
          );
        })}
        {!testimonies.length ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">No testimonies have been submitted yet.</div>
        ) : null}
      </div>
    </div>
  );
}
