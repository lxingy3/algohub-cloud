import { prisma } from './prisma';
import { getJurisdictionId } from './jurisdiction';

const APPROVED = 'APPROVED';
const IMPACTS = new Set(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']);
const IMPACT_LEVELS = new Set(['HIGH', 'MEDIUM', 'LOW']);
const STATUSES = new Set(['ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED']);
const SUBMISSION_METHODS = new Set(['WEB_FORM', 'FACILITATED_SESSION', 'AUDIO_TRANSCRIPTION', 'PAPER_SCAN']);

function enumValue(value, allowed) {
  const normalized = (value || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
  return allowed.has(normalized) ? normalized : '';
}

function enumList(value, allowed) {
  return (value || '')
    .split(',')
    .map((item) => enumValue(item, allowed))
    .filter(Boolean);
}

function dateValue(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

export function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function normalizeThemes(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((item) => {
    if (typeof item === 'string') return { theme: item, confidence: null };
    return { theme: item?.theme || item?.label || item?.name || '', confidence: Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null };
  }).filter((item) => item.theme);
}

export async function getApprovedBriefingCorpus({
  algorithm = '',
  agency = '',
  dateFrom = null,
  dateTo = null,
  domain = '',
  impact = '',
  impactLevel = '',
  language = '',
  submissionMethod = '',
} = {}) {
  const jurisdictionId = getJurisdictionId();
  const algorithmFilter = {
    ...(algorithm ? { slug: algorithm } : {}),
    ...(agency ? { agencyName: { contains: agency, mode: 'insensitive' } } : {}),
    ...(impactLevel ? { impactLevel } : {}),
  };
  const submittedAt = {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  };
  return prisma.testimony.findMany({
    where: {
      jurisdictionId,
      moderationStatus: APPROVED,
      ...(domain ? { affectedDomain: domain } : {}),
      ...(language ? { originalLanguage: language } : {}),
      ...(submissionMethod ? { submissionMethod } : {}),
      ...(Object.keys(submittedAt).length ? { submittedAt } : {}),
      ...(impact ? { OR: [{ selfReportedImpact: impact }, { aiImpactClassification: impact }] } : {}),
      ...(Object.keys(algorithmFilter).length ? { algorithmLinks: { some: { algorithm: algorithmFilter } } } : {}),
    },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      title: true,
      summary: true,
      narrativeText: true,
      submissionMethod: true,
      originalLanguage: true,
      affectedDomain: true,
      selfReportedImpact: true,
      aiImpactClassification: true,
      aiThemes: true,
      aiConfidenceScore: true,
      clusterId: true,
      isOutlier: true,
      topicId: true,
      umapX: true,
      umapY: true,
      neighbourhood: true,
      submittedAt: true,
      corpusTopic: { select: { label: true, topKeywords: true } },
      partnerOrganization: { select: { name: true, slug: true } },
      algorithmLinks: {
        select: {
          algorithm: {
            select: { id: true, slug: true, name: true, useCase: true, agencyName: true, impactLevel: true, status: true },
          },
        },
      },
    },
  });
}

export function anonymizedExcerpt(row) {
  const text = row.summary || row.narrativeText || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 280);
}

export function storyTitle(row) {
  return row.title || anonymizedExcerpt(row).slice(0, 80) || 'Untitled story';
}

export function monthKey(date) {
  if (!date) return 'Unknown';
  return date.toISOString().slice(0, 7);
}

export function evidenceLevel(count, outlierCount, avgConfidence) {
  if (count >= 8 && avgConfidence >= 0.7) return 'robust';
  if (count >= 4) return outlierCount ? 'mixed but usable' : 'moderate';
  return 'thin';
}

export function parseExploreFilters(request) {
  const params = new URL(request.url).searchParams;
  const dateFrom = dateValue(params.get('date_from'));
  const dateTo = dateValue(params.get('date_to'), true);
  return {
    agency: params.get('agency') || '',
    algorithm: params.get('algorithm') || '',
    dateFrom,
    dateTo,
    domain: params.get('domain') || '',
    theme: params.get('theme') || '',
    dimension: params.get('dimension') || 'domain',
    impact: enumValue(params.get('impact'), IMPACTS),
    impactLevel: enumValue(params.get('impact_level'), IMPACT_LEVELS),
    language: params.get('language') || '',
    reviewStatus: enumValue(params.get('review_status'), new Set([APPROVED])),
    silencePriority: params.get('silence_priority') || '',
    status: enumList(params.get('status'), STATUSES),
    submissionMethod: enumValue(params.get('submission_method'), SUBMISSION_METHODS),
  };
}

export async function getAlgorithmLandscape({ agency = '', algorithm = '', domain = '', impactLevel = '', status = [] } = {}) {
  const jurisdictionId = getJurisdictionId();
  const algorithms = await prisma.algorithm.findMany({
    where: {
      jurisdictionId,
      ...(algorithm ? { slug: algorithm } : {}),
      ...(agency ? { agencyName: { contains: agency, mode: 'insensitive' } } : {}),
      ...(domain ? { useCase: domain } : {}),
      ...(impactLevel ? { impactLevel } : {}),
      ...(status?.length ? { status: { in: status } } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      useCase: true,
      agencyName: true,
      impactLevel: true,
      status: true,
      yearDeployed: true,
      currentVersion: true,
      testimonyLinks: { where: { testimony: { moderationStatus: APPROVED } }, select: { testimonyId: true } },
    },
  });
  return algorithms.map((algorithm) => ({
    ...algorithm,
    approvedTestimonyCount: algorithm.testimonyLinks.length,
    testimonyLinks: undefined,
  }));
}
