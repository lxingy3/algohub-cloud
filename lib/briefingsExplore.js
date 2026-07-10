import { prisma } from './prisma';
import { getJurisdictionId } from './jurisdiction';

const APPROVED = 'APPROVED';
const IMPACTS = new Set(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']);
const IMPACT_LEVELS = new Set(['HIGH', 'MEDIUM', 'LOW']);
const LENSES = new Set(['community', 'intermediary', 'government']);
const STATUSES = new Set(['ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED']);
const SUBMISSION_METHODS = new Set(['WEB_FORM', 'FACILITATED_SESSION', 'AUDIO_TRANSCRIPTION', 'PAPER_SCAN']);
export const GOVERNMENT_MIN_GROUP_COUNT = 5;

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

function lensValue(value) {
  return LENSES.has(value) ? value : '';
}

function dateValue(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

export function countBy(items, keyFn, { minCount = 0 } = {}) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((row) => row.count >= minCount)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function minGroupCountForLens(lens) {
  return lens === 'government' ? GOVERNMENT_MIN_GROUP_COUNT : 0;
}

export function normalizeThemes(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((item) => {
    if (typeof item === 'string') return { theme: item, confidence: null, suggested: true };
    const confidence = Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null;
    return {
      theme: item?.theme || item?.label || item?.name || '',
      confidence,
      suggested: confidence === null || confidence < 0.75,
    };
  }).filter((item) => item.theme && (item.confidence === null || item.confidence > 0.5));
}

export function storedKeywords(row, limit = 8) {
  const topicKeywords = Array.isArray(row.corpusTopic?.topKeywords) ? row.corpusTopic.topKeywords : [];
  const taskKeywords = Array.isArray(row.aiExtractedExperiences?.keywords) ? row.aiExtractedExperiences.keywords : [];
  return [...new Set([...topicKeywords, ...taskKeywords].map((value) => String(value || '').trim()).filter(Boolean))].slice(0, limit);
}

export function umapDistance(a, b) {
  if (!Number.isFinite(Number(a?.umapX)) || !Number.isFinite(Number(a?.umapY))) return Infinity;
  if (!Number.isFinite(Number(b?.umapX)) || !Number.isFinite(Number(b?.umapY))) return Infinity;
  return Math.hypot(Number(a.umapX) - Number(b.umapX), Number(a.umapY) - Number(b.umapY));
}

export function topicClusterSimilarity(a, b) {
  let score = 0;
  if (a?.topicId !== null && a?.topicId !== undefined && a.topicId === b?.topicId) score += 0.45;
  if (a?.clusterId !== null && a?.clusterId !== undefined && a.clusterId === b?.clusterId) score += 0.35;
  const distance = umapDistance(a, b);
  if (Number.isFinite(distance)) score += Math.max(0, 0.2 - Math.min(distance, 6) / 30);
  return Number(score.toFixed(3));
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
  status = [],
  submissionMethod = '',
} = {}) {
  const jurisdictionId = getJurisdictionId();
  const algorithmFilter = {
    ...(algorithm ? { slug: algorithm } : {}),
    ...(agency ? { agencyName: { contains: agency, mode: 'insensitive' } } : {}),
    ...(impactLevel ? { impactLevel } : {}),
    ...(status?.length ? { status: { in: status } } : {}),
  };
  const submittedAt = {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lte: dateTo } : {}),
  };
  const storyFilters = [
    ...(domain ? [{
      OR: [
        { affectedDomain: domain },
        { algorithmLinks: { some: { algorithm: { useCase: domain } } } },
      ],
    }] : []),
    ...(impact ? [{ OR: [{ selfReportedImpact: impact }, { aiImpactClassification: impact }] }] : []),
  ];
  return prisma.testimony.findMany({
    where: {
      jurisdictionId,
      moderationStatus: APPROVED,
      ...(language ? { originalLanguage: language } : {}),
      ...(submissionMethod ? { submissionMethod } : {}),
      ...(Object.keys(submittedAt).length ? { submittedAt } : {}),
      ...(storyFilters.length ? { AND: storyFilters } : {}),
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
      aiExtractedExperiences: true,
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
  const text = row.brief?.summary || row.summary || row.transcriptionText || row.narrativeText || '';
  return redactStoredEntities(text.replace(/\s+/g, ' ').trim(), row.aiExtractedExperiences).slice(0, 280);
}

function redactStoredEntities(text, experiences) {
  const entities = experiences?.entities && typeof experiences.entities === 'object' ? experiences.entities : {};
  const sensitiveGroups = ['people', 'persons', 'peopleNames', 'locations', 'addresses'];
  let redacted = text;
  for (const group of sensitiveGroups) {
    const values = Array.isArray(entities[group]) ? entities[group] : [];
    for (const value of values) {
      const entity = String(value || '').trim();
      if (entity.length < 3) continue;
      redacted = redacted.replace(new RegExp(`\\b${escapeRegex(entity)}\\b`, 'gi'), `[${group}]`);
    }
  }
  return redacted;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    lens: lensValue(params.get('lens')),
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
