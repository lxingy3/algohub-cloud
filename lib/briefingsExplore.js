import { prisma } from './prisma';
import { getJurisdictionId } from './jurisdiction';

const APPROVED = 'APPROVED';

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

export async function getApprovedBriefingCorpus({ algorithm = '', domain = '' } = {}) {
  const jurisdictionId = getJurisdictionId();
  return prisma.testimony.findMany({
    where: {
      jurisdictionId,
      moderationStatus: APPROVED,
      ...(domain ? { affectedDomain: domain } : {}),
      ...(algorithm ? { algorithmLinks: { some: { algorithm: { slug: algorithm } } } } : {}),
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
  return {
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
    theme: params.get('theme') || '',
    dimension: params.get('dimension') || 'domain',
  };
}

export async function getAlgorithmLandscape() {
  const jurisdictionId = getJurisdictionId();
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      useCase: true,
      agencyName: true,
      impactLevel: true,
      status: true,
      testimonyLinks: { where: { testimony: { moderationStatus: APPROVED } }, select: { testimonyId: true } },
    },
  });
  return algorithms.map((algorithm) => ({
    ...algorithm,
    approvedTestimonyCount: algorithm.testimonyLinks.length,
    testimonyLinks: undefined,
  }));
}
