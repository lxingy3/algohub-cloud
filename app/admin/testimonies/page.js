import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { CheckCircle2, Mic2 } from 'lucide-react';
import {
  allowedModerationActions,
  isModerationStatus,
  moderationStatusOrder,
  moderationStatuses,
} from '../../../lib/moderation';

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

export default async function AdminTestimoniesPage({ searchParams }) {
  const params = await searchParams;
  const statusFilter = String(params?.status || '').toUpperCase();
  const jurisdictionId = getJurisdictionId();
  const where = {
    jurisdictionId,
    ...(isModerationStatus(statusFilter) ? { moderationStatus: statusFilter } : {}),
  };
  const [testimonies, statusCounts] = await Promise.all([
    prisma.testimony.findMany({
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
        transcriptionStatus: true,
        transcriptionText: true,
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
    }),
    prisma.testimony.groupBy({
      by: ['moderationStatus'],
      where: { jurisdictionId },
      _count: { moderationStatus: true },
    }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((item) => [item.moderationStatus, item._count.moderationStatus]));
  testimonies.sort((a, b) => (moderationStatusOrder[a.moderationStatus] ?? 9) - (moderationStatusOrder[b.moderationStatus] ?? 9) || b.submittedAt - a.submittedAt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{statusFilter === 'PENDING' ? 'Pending Testimony Queue' : 'Testimony Queue'}</h1>
        {isModerationStatus(statusFilter) ? (
          <a href="/admin/testimonies" className="inline-flex min-h-11 items-center rounded-md border bg-white px-3 py-2 text-sm">Show all</a>
        ) : null}
      </div>
      <StatusTabs baseHref="/admin/testimonies" activeStatus={statusFilter} counts={counts} />
      <Task1TranscriptionDemo />
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
              {isModerationStatus(statusFilter) ? <input type="hidden" name="returnTo" value={`/admin/testimonies?status=${statusFilter}`} /> : null}
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

              {testimony.transcriptionText ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Task 1 transcription result</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-800">{testimony.transcriptionStatus}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-950">{testimony.transcriptionText}</p>
                </div>
              ) : storyType === 'voice' ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <span className="font-semibold">Task 1 transcription:</span> {testimony.transcriptionStatus}
                </div>
              ) : null}

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
                {allowedModerationActions(testimony.moderationStatus).map(([nextStatus, label]) => (
                  <button key={nextStatus} name="status" value={nextStatus} className={`min-h-11 rounded-md border px-3 py-2 text-sm ${nextStatus === 'REJECTED' ? 'text-red-700' : ''}`}>
                    {label}
                  </button>
                ))}
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

function Task1TranscriptionDemo() {
  const segments = [
    { start: 0.0, end: 3.3, text: 'I remember when I saw you for the first time' },
    { start: 3.3, end: 6.6, text: 'You were laughing sparkly like a new dime' },
    { start: 6.6, end: 11.51, text: "You'd be mine" },
  ];

  return (
    <section className="mt-5 rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Mic2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-950">Task 1 transcription test result</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Whisper small converted the sample audio into raw story text. This is simply transcript output.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-64">
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">small</span>
            <span className="text-slate-500">model</span>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">en</span>
            <span className="text-slate-500">language</span>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-2">
            <span className="block font-semibold text-slate-950">15.0s</span>
            <span className="text-slate-500">audio</span>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">
          I remember when I saw you for the first time You were laughing sparkly like a new dime You&apos;d be mine
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={`${segment.start}-${segment.end}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500">{segment.start.toFixed(1)}s - {segment.end.toFixed(2)}s</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{segment.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusTabs({ baseHref, activeStatus, counts }) {
  const allCount = moderationStatuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto rounded-lg border bg-white p-2" aria-label="Moderation status">
      <a
        href={baseHref}
        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${!activeStatus ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        All
        <span className={`rounded-full px-2 py-0.5 text-xs ${!activeStatus ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{allCount}</span>
      </a>
      {moderationStatuses.map((status) => {
        const active = activeStatus === status;
        return (
          <a
            key={status}
            href={active ? baseHref : `${baseHref}?status=${status}`}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {formatStatusLabel(status)}
            <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{counts[status] || 0}</span>
          </a>
        );
      })}
    </nav>
  );
}

function formatStatusLabel(status) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
