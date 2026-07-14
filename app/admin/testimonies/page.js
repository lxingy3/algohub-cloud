import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import {
  allowedModerationActions,
  isModerationStatus,
  moderationStatuses,
} from '../../../lib/moderation';
import { buildStorySummary } from '../../../lib/storySummary';
import AdminMediaPlayer from './AdminMediaPlayer';
import { InlineExpandableText, MLPipelinePanel } from './ExpandablePanels';
import MLQuickTest from './MLQuickTest';

export const dynamic = 'force-dynamic';
const pageSize = 10;

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
  const focusId = String(params?.focus || '').trim();
  const pageNumber = Math.max(1, Number.parseInt(String(params?.page || '1'), 10) || 1);
  const jurisdictionId = getJurisdictionId();
  const where = {
    jurisdictionId,
    ...(focusId ? { id: focusId } : {}),
    ...(isModerationStatus(statusFilter) ? { moderationStatus: statusFilter } : {}),
  };
  const [testimonies, statusCounts, filteredCount, mediaFlagRows] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: [{ moderationStatus: 'asc' }, { submittedAt: 'desc' }],
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        summary: true,
        submitterName: true,
        submitterEmail: true,
        storyType: true,
        mediaMimeType: true,
        transcriptionStatus: true,
        transcriptionText: true,
        transcriptionError: true,
        moderationStatus: true,
        city: true,
        zipCode: true,
        referralSource: true,
        narrativeText: true,
        publicPosting: true,
        followupConsent: true,
        selfReportedImpact: true,
        aiImpactClassification: true,
        aiConfidenceScore: true,
        aiThemes: true,
        aiExtractedExperiences: true,
        moderationNotes: true,
        mediaDurationSeconds: true,
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
    prisma.testimony.count({ where }),
    prisma.$queryRaw`
      SELECT
        id::text AS id,
        (audio_file_url IS NOT NULL) AS "hasAudio",
        (video_file_url IS NOT NULL) AS "hasVideo"
      FROM testimonies
      WHERE jurisdiction_id = ${jurisdictionId}
    `,
  ]);
  const counts = Object.fromEntries(statusCounts.map((item) => [item.moderationStatus, item._count.moderationStatus]));
  const mediaFlags = new Map(mediaFlagRows.map((row) => [row.id, row]));
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const returnTo = focusId ? `/admin/testimonies?focus=${encodeURIComponent(focusId)}` : queueHref(statusFilter, pageNumber);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{focusId ? 'Testimony Review' : statusFilter === 'PENDING' ? 'Pending Testimony Queue' : 'Testimony Queue'}</h1>
        {focusId || isModerationStatus(statusFilter) ? (
          <a href="/admin/testimonies" className="inline-flex min-h-11 items-center rounded-md border bg-white px-3 py-2 text-sm">Show all</a>
        ) : null}
      </div>
      <StatusTabs baseHref="/admin/testimonies" activeStatus={statusFilter} counts={counts} />
      <MLQuickTest />
      <div className="mt-6 space-y-3">
        {testimonies.map((testimony) => {
          const linkedAlgorithms = testimony.algorithmLinks.map((link) => link.algorithm?.name).filter(Boolean);
          const submitter = testimony.submitterName || testimony.user?.name || 'Anonymous';
          const submitterEmail = testimony.submitterEmail || testimony.user?.email || '';
          const storyType = testimony.storyType || 'text';
          const media = mediaFlags.get(testimony.id) || {};
          const hasAudio = Boolean(media.hasAudio);
          const hasVideo = Boolean(media.hasVideo);
          const audioFieldMediaKind = testimony.mediaMimeType?.startsWith('video/') ? 'video' : 'audio';
          const isVoiceInput = storyType === 'voice' || hasAudio || hasVideo;
          const mlResult = getStoredMlResult(testimony, isVoiceInput);
          const aiSummary = testimony.summary || buildStorySummary(testimony.narrativeText || testimony.transcriptionText || '');
          const mediaSources = [
            hasAudio ? {
              kind: audioFieldMediaKind,
              url: `/api/admin/testimonies/${testimony.id}/media/audio`,
            } : null,
            hasVideo ? {
              kind: 'video',
              url: `/api/admin/testimonies/${testimony.id}/media/video`,
            } : null,
          ].filter(Boolean);

          return (
            <form key={testimony.id} action={`/api/admin/testimonies/${testimony.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
              <input type="hidden" name="returnTo" value={returnTo} />
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

              <InlineExpandableText
                className="mt-4 border-slate-200 bg-slate-50"
                label="Story details"
                text={testimony.narrativeText || 'No written story details were submitted.'}
                collapsedChars={360}
              />

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">AI-generated summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-800">{aiSummary || 'No summary available.'}</p>
              </div>

              {hasAudio || hasVideo ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Uploaded media</p>
                  <AdminMediaPlayer sources={mediaSources} />
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

              <MLPipelinePanel
                result={mlResult}
              />

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
      {filteredCount > pageSize ? (
        <nav className="mt-5 flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:flex-row" aria-label="Testimony pages">
          <span className="text-slate-600">Page {Math.min(pageNumber, totalPages)} of {totalPages} - {filteredCount} records</span>
          <div className="flex gap-2">
            {pageNumber > 1 ? <a href={queueHref(statusFilter, pageNumber - 1)} className="inline-flex min-h-10 items-center rounded-md border px-3 py-2 font-semibold hover:bg-amber-50">Previous</a> : <span className="inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-slate-400">Previous</span>}
            {pageNumber < totalPages ? <a href={queueHref(statusFilter, pageNumber + 1)} className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800">Next</a> : <span className="inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-slate-400">Next</span>}
          </div>
        </nav>
      ) : null}
    </div>
  );
}


function StatusTabs({ baseHref, activeStatus, counts }) {
  const allCount = moderationStatuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
  return (
    <nav className="mt-5 flex flex-wrap gap-2 rounded-lg border bg-white p-2" aria-label="Moderation status">
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

function queueHref(status, page) {
  const params = new URLSearchParams();
  if (isModerationStatus(status)) params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/admin/testimonies${query ? `?${query}` : ''}`;
}

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

function getStoredMlResult(testimony, isVoiceInput) {
  const task1 = buildStoredTask1(testimony, isVoiceInput);
  const impactConfidence = numberOrNull(testimony.aiConfidenceScore);
  const task2 = testimony.aiImpactClassification ? {
    status: 'COMPLETED',
    aiImpactClassification: testimony.aiImpactClassification,
    aiConfidenceScore: impactConfidence,
    humanReviewRequired: impactConfidence === null || impactConfidence <= 0.85,
  } : notRunTask();
  const task3 = Array.isArray(testimony.aiThemes) ? {
    status: 'COMPLETED',
    aiThemes: normalizeThemes(testimony.aiThemes),
  } : notRunTask();
  const experiences = isRecord(testimony.aiExtractedExperiences) ? testimony.aiExtractedExperiences : null;
  const task4 = isRecord(experiences?.entities) ? {
    status: 'COMPLETED',
    entities: normalizeEntities(experiences.entities),
  } : notRunTask();
  const task5 = Array.isArray(experiences?.keywords) ? {
    status: 'COMPLETED',
    keywords: normalizeStringArray(experiences.keywords).slice(0, 10),
  } : notRunTask();
  const tasks = [task1, task2, task3, task4, task5];

  return {
    source: 'stored-testimony',
    status: tasks.every((task) => task.status === 'COMPLETED' || task.status === 'SKIPPED')
      ? 'COMPLETED'
      : tasks.some((task) => task.status === 'COMPLETED') ? 'PARTIAL' : 'NOT_RUN',
    task1,
    task2,
    task3,
    task4,
    task5,
  };
}

function buildStoredTask1(testimony, isVoiceInput) {
  if (!isVoiceInput) return { status: 'SKIPPED', reason: 'Skipped for text input.' };
  if (testimony.transcriptionText) {
    return { status: 'COMPLETED', transcript: testimony.transcriptionText };
  }

  const storedStatus = String(testimony.transcriptionStatus || 'PENDING').toUpperCase();
  const status = storedStatus === 'NOT_REQUIRED' ? 'PENDING' : storedStatus;
  return {
    status,
    ...(testimony.transcriptionError ? { error: testimony.transcriptionError } : {}),
    reason: status === 'PENDING' ? 'Waiting for transcription.' : undefined,
  };
}

function notRunTask() {
  return { status: 'NOT_RUN', reason: 'No stored result.' };
}

function normalizeThemes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { theme: item, confidence: null, label: 'suggested' };
      if (!item || typeof item !== 'object') return null;
      const confidence = numberOrNull(item.confidence);
      return {
        theme: String(item.theme || item.label || '').trim(),
        confidence,
        label: item.label === 'suggested' || confidence === null || confidence < 0.75 ? 'suggested' : 'detected',
      };
    })
    .filter((item) => item?.theme);
}

function normalizeEntities(value) {
  return Object.fromEntries(entityGroups.map((group) => [group, normalizeStringArray(value[group])]));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
