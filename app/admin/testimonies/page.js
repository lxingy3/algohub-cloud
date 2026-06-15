import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import {
  allowedModerationActions,
  isModerationStatus,
  moderationStatusOrder,
  moderationStatuses,
} from '../../../lib/moderation';
import { inferStoredMediaKind } from '../../../lib/mediaStorage';
import AdminMediaPlayer from './AdminMediaPlayer';

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

function getDirectMediaUrl(mediaUrl) {
  if (!mediaUrl || mediaUrl.startsWith('data:') || mediaUrl.startsWith('gcs://')) return '';
  return mediaUrl;
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
        aiImpactClassification: true,
        aiConfidenceScore: true,
        aiThemes: true,
        aiExtractedExperiences: true,
        aiProcessedAt: true,
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
      <div className="mt-6 space-y-3">
        {testimonies.map((testimony) => {
          const linkedAlgorithms = testimony.algorithmLinks.map((link) => link.algorithm?.name).filter(Boolean);
          const submitter = testimony.submitterName || testimony.user?.name || 'Anonymous';
          const submitterEmail = testimony.submitterEmail || testimony.user?.email || '';
          const storyType = testimony.storyType || 'text';
          const hasAudio = Boolean(testimony.audioFileUrl);
          const hasVideo = Boolean(testimony.videoFileUrl);
          const audioFieldMediaKind = hasAudio ? inferStoredMediaKind(testimony.audioFileUrl, 'audio') : 'audio';
          const isVoiceInput = storyType === 'voice' || hasAudio;
          const task2Impact = getTask2Impact(testimony);
          const task345Insights = getTask345Insights(testimony);
          const mediaSources = [
            hasAudio ? {
              kind: audioFieldMediaKind,
              url: `/api/admin/testimonies/${testimony.id}/media/audio`,
              directUrl: getDirectMediaUrl(testimony.audioFileUrl),
            } : null,
            hasVideo ? {
              kind: 'video',
              url: `/api/admin/testimonies/${testimony.id}/media/video`,
              directUrl: getDirectMediaUrl(testimony.videoFileUrl),
            } : null,
          ].filter(Boolean);

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

              {isVoiceInput ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Task 1 transcription</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-800">{testimony.transcriptionStatus}</span>
                  </div>
                  {testimony.transcriptionText ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-950">{testimony.transcriptionText}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-emerald-900">No transcript saved yet.</p>
                  )}
                </div>
              ) : null}

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

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Task 2 impact classification</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">{task2Impact.classification}</span>
                  <span className="text-slate-600">confidence {formatConfidence(task2Impact.confidence)}</span>
                  {task2Impact.source === 'estimate' ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Page estimate</span>
                  ) : null}
                  {task2Impact.confidence < 0.85 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Needs review</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Task 3 theme detection</p>
                  {task345Insights.source === 'estimate' ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Page estimate</span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task345Insights.themes.map((theme) => (
                    <span key={theme.theme} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                      {formatThemeLabel(theme.theme)} {formatConfidence(theme.confidence)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Task 4 entity extraction</p>
                <div className="mt-2 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                  {Object.entries(task345Insights.entities).map(([group, values]) => (
                    <div key={group}>
                      <span className="block text-xs font-semibold uppercase text-slate-500">{formatEntityGroup(group)}</span>
                      <span>{values.length ? values.join(', ') : 'None found'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Task 5 keyword extraction</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task345Insights.keywords.length ? task345Insights.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{keyword}</span>
                  )) : <span className="text-sm text-slate-600">None found</span>}
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

function formatConfidence(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 'not available';
  return score.toFixed(2);
}

function formatThemeLabel(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEntityGroup(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTask2Impact(testimony) {
  if (testimony.aiImpactClassification) {
    return {
      classification: testimony.aiImpactClassification,
      confidence: Number.isFinite(Number(testimony.aiConfidenceScore)) ? Number(testimony.aiConfidenceScore) : 0,
      source: 'stored',
    };
  }

  const text = [
    testimony.title,
    testimony.narrativeText,
    testimony.transcriptionText,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!text.trim()) {
    return { classification: 'UNCLEAR', confidence: 0.5, source: 'estimate' };
  }

  const negativeScore = scoreTerms(text, [
    'harm',
    'harmed',
    'unsafe',
    'denied',
    'delay',
    'delayed',
    'wrong',
    'incorrect',
    'risk',
    'flag',
    'flagged',
    'low priority',
    'unfair',
    'complaint',
    'failed',
    'missing',
    'not eligible',
    'rejected',
    'ignored',
    'worse',
    'problem',
  ]);
  const positiveScore = scoreTerms(text, [
    'help',
    'helped',
    'support',
    'supported',
    'worked',
    'successful',
    'success',
    'faster',
    'right person',
    'improved',
    'approved',
    'resolved',
    'connected',
    'completed',
    'benefit',
    'better',
  ]);
  const unclearScore = scoreTerms(text, [
    'not sure',
    'unclear',
    'do not know',
    "don't know",
    'unknown',
    'no clear',
    'cannot tell',
  ]);

  if (unclearScore >= 2 && Math.max(negativeScore, positiveScore) <= 1) {
    return { classification: 'UNCLEAR', confidence: confidenceFromScore(unclearScore), source: 'estimate' };
  }
  if (negativeScore >= 2 && positiveScore >= 2) {
    return { classification: 'MIXED', confidence: confidenceFromScore(Math.min(negativeScore, positiveScore) + 1), source: 'estimate' };
  }
  if (negativeScore > positiveScore) {
    return { classification: 'NEGATIVE', confidence: confidenceFromScore(negativeScore), source: 'estimate' };
  }
  if (positiveScore > negativeScore) {
    return { classification: 'POSITIVE', confidence: confidenceFromScore(positiveScore), source: 'estimate' };
  }
  return { classification: 'UNCLEAR', confidence: 0.55, source: 'estimate' };
}

function scoreTerms(text, terms) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function confidenceFromScore(score) {
  return Math.min(0.84, 0.58 + score * 0.07);
}

const themeTerms = {
  opacity: ['explain', 'explained', 'why', 'how', 'transparent', 'transparency', 'calculated', 'criteria'],
  positive_experience: ['helped', 'worked', 'successful', 'faster', 'connected', 'completed', 'approved', 'right person'],
  lack_of_recourse: ['appeal', 'challenge', 'no way', 'could not dispute', 'recourse', 'review'],
  process_confusion: ['confused', 'confusion', 'unclear', 'not sure', 'do not know', "didn't know"],
  arbitrary_outcome: ['random', 'inconsistent', 'arbitrary', 'did not match', 'mismatch'],
  delayed_outcome: ['delay', 'delayed', 'waiting', 'months', 'weeks', 'took too long', 'slow'],
  discriminatory_impact: ['bias', 'biased', 'discriminatory', 'race', 'racial', 'income', 'demographic', 'homeless'],
  lack_of_notification: ['not told', 'no notice', 'notice', 'algorithm involved', "didn't realize"],
  data_accuracy: ['incorrect', 'wrong', 'outdated', 'old record', 'missing data', 'accuracy', 'record'],
  loss_of_dignity: ['dignity', 'dehumanized', 'treated', 'suspicion', 'punished', 'ashamed'],
};

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

function getTask345Insights(testimony) {
  const storedThemes = normalizeThemes(testimony.aiThemes);
  const storedExperiences = normalizeExperiences(testimony.aiExtractedExperiences);
  const hasStoredResults = storedThemes.length || Object.values(storedExperiences.entities).some((values) => values.length) || storedExperiences.keywords.length;
  if (hasStoredResults) {
    return {
      source: 'stored',
      themes: storedThemes.length ? storedThemes : estimateThemes(testimony),
      entities: storedExperiences.entities,
      keywords: storedExperiences.keywords,
    };
  }

  return {
    source: 'estimate',
    themes: estimateThemes(testimony),
    entities: estimateEntities(testimony),
    keywords: estimateKeywords(testimony),
  };
}

function normalizeThemes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { theme: item, confidence: 0 };
      if (!item || typeof item !== 'object') return null;
      return {
        theme: String(item.theme || item.label || '').trim(),
        confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
      };
    })
    .filter((item) => item?.theme)
    .slice(0, 5);
}

function normalizeExperiences(value) {
  const entities = Object.fromEntries(entityGroups.map((group) => [group, []]));
  const keywords = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { entities, keywords };

  const rawEntities = value.entities && typeof value.entities === 'object' && !Array.isArray(value.entities) ? value.entities : {};
  for (const group of entityGroups) {
    entities[group] = normalizeStringArray(rawEntities[group]);
  }
  return {
    entities,
    keywords: normalizeStringArray(value.keywords).slice(0, 10),
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function estimateThemes(testimony) {
  const text = getStoryText(testimony).toLowerCase();
  const themes = Object.entries(themeTerms)
    .map(([theme, terms]) => {
      const matches = terms.filter((term) => text.includes(term));
      return matches.length ? { theme, confidence: confidenceFromScore(matches.length), evidence: matches.slice(0, 4) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return themes.length ? themes : [{ theme: 'process_confusion', confidence: 0.5, evidence: [] }];
}

function estimateEntities(testimony) {
  const text = getStoryText(testimony);
  const lowerText = text.toLowerCase();
  return {
    agencies: uniqueMatches(text.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+(?:Agency|Department|Office|Authority|Center|University|County)\b/g)),
    locations: uniqueMatches(text.match(/\b(?:Pittsburgh|Allegheny County|Downtown Labor Center)\b/g)),
    systems: [
      'risk score',
      'priority score',
      'waiting list',
      'screening tool',
      'routing system',
      'inspection system',
      'student support system',
      'benefits system',
      'housing system',
      'traffic management system',
    ].filter((term) => lowerText.includes(term)),
    dates: uniqueMatches(text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\b\d{4}\b/g)),
    people_roles: [
      'caseworker',
      'worker',
      'screeners',
      'supervisors',
      'counselor',
      'teacher',
      'tenant',
      'resident',
      'parent',
      'student',
      'caller',
      'interpreter',
      'agency staff',
      'community member',
    ].filter((term) => lowerText.includes(term)),
  };
}

function estimateKeywords(testimony) {
  const stopwords = new Set(['able', 'about', 'after', 'again', 'also', 'and', 'are', 'because', 'before', 'being', 'but', 'could', 'during', 'every', 'first', 'for', 'from', 'had', 'has', 'have', 'here', 'her', 'him', 'his', 'how', 'into', 'like', 'made', 'more', 'most', 'not', 'one', 'our', 'out', 'over', 'own', 'she', 'than', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'too', 'was', 'were', 'when', 'where', 'which', 'while', 'who', 'why', 'with', 'without', 'would', 'you', 'your', 'system', 'algorithm', 'automated', 'public', 'service', 'story']);
  const words = getStoryText(testimony).toLowerCase().match(/[a-z][a-z'-]{2,}/g)?.filter((word) => !stopwords.has(word)) || [];
  const candidates = [];
  for (const size of [3, 2]) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(' ');
      if (new Set(phrase.split(' ')).size > 1) candidates.push(phrase);
    }
  }
  candidates.push(...words);

  const counts = new Map();
  for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([candidate]) => candidate);
  const selected = [];
  for (const candidate of ranked) {
    const tokens = new Set(candidate.split(' '));
    const repeatsExisting = selected.some((existing) => {
      const existingTokens = new Set(existing.split(' '));
      const overlap = [...tokens].filter((token) => existingTokens.has(token)).length;
      return overlap >= Math.min(tokens.size, 2);
    });
    if (!repeatsExisting) selected.push(candidate);
    if (selected.length >= 10) break;
  }
  return selected;
}

function getStoryText(testimony) {
  return [testimony.title, testimony.narrativeText, testimony.transcriptionText].filter(Boolean).join(' ');
}

function uniqueMatches(matches) {
  return [...new Set(matches || [])];
}
