import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { rankAlgorithmsForSearch, searchTokens } from '../../../lib/searchRanking';

export const dynamic = 'force-dynamic';

const listSelect = {
  id: true,
  sourceId: true,
  jurisdictionId: true,
  name: true,
  slug: true,
  description: true,
  purpose: true,
  agencyName: true,
  agencyType: true,
  useCase: true,
  location: true,
  dataUsed: true,
  decisionType: true,
  yearIntroduced: true,
  yearDeployed: true,
  status: true,
  currentVersion: true,
  impactLevel: true,
  officialDocumentationUrl: true,
  storyboardSvg: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      testimonyLinks: {
        where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } },
      },
    },
  },
};

function getPagination(searchParams) {
  const requestedPage = Number(searchParams.get('page') || 1);
  const requestedLimit = Number(searchParams.get('limit') || 20);
  const page = Number.isFinite(requestedPage) ? Math.max(Math.trunc(requestedPage), 1) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;
  return { page, limit, skip: (page - 1) * limit };
}

function normalizeStatusList(value) {
  const valid = new Set(['ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED']);
  return value.split(',')
    .map((item) => item.trim().toUpperCase().replace(/[\s-]+/g, '_'))
    .filter((item) => valid.has(item));
}

function normalizeImpactLevel(value) {
  const normalized = (value || '').trim().toUpperCase();
  return ['HIGH', 'MEDIUM', 'LOW'].includes(normalized) ? normalized : '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jurisdictionId = getJurisdictionId();
  const { page, limit, skip } = getPagination(searchParams);
  const search = (searchParams.get('search') || '').trim().slice(0, 100);
  const useCase = searchParams.get('use_case') || searchParams.get('domain') || '';
  const location = searchParams.get('location') || '';
  const agency = searchParams.get('agency') || '';
  const impactLevel = normalizeImpactLevel(searchParams.get('impact_level'));
  const statuses = normalizeStatusList(searchParams.get('status') || '');

  const where = {
    jurisdictionId,
    ...(useCase ? { useCase } : {}),
    ...(location ? { location } : {}),
    ...(agency ? { agencyName: { contains: agency, mode: 'insensitive' } } : {}),
    ...(impactLevel ? { impactLevel } : {}),
    ...(statuses.length ? { status: { in: statuses } } : {}),
  };

  if (search) {
    const candidates = await prisma.algorithm.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        ...listSelect,
        claims: {
          select: {
            claimText: true,
            claimSource: true,
          },
        },
        documents: {
          select: {
            title: true,
            sourceType: true,
          },
        },
        testimonyLinks: {
          where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } },
          select: {
            testimony: {
              select: {
                title: true,
                summary: true,
              },
            },
          },
        },
      },
    });
    const searchableCandidates = await addFullTextMatchMarkers(candidates, searchTokens(search).slice(0, 8));
    const ranked = rankAlgorithmsForSearch(searchableCandidates, search);
    const items = ranked.slice(skip, skip + limit).map((algorithm) => {
      const item = { ...algorithm };
      delete item.claims;
      delete item.documents;
      delete item.testimonyLinks;
      return item;
    });

    return NextResponse.json({ items, page, limit, total: ranked.length });
  }

  const [items, total] = await Promise.all([
    prisma.algorithm.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      include: {
        _count: { select: { testimonyLinks: { where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } } } } },
      },
    }),
    prisma.algorithm.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

async function addFullTextMatchMarkers(candidates, tokens) {
  const algorithmIds = candidates.map(({ id }) => id);
  if (!algorithmIds.length || !tokens.length) return candidates;

  const [documentMatches, narrativeMatches] = await Promise.all([
    prisma.algorithmDocument.findMany({
      where: {
        algorithmId: { in: algorithmIds },
        AND: tokens.map((token) => ({ rawText: { contains: token, mode: 'insensitive' } })),
      },
      select: { algorithmId: true },
    }),
    prisma.testimonyAlgorithmLink.findMany({
      where: {
        algorithmId: { in: algorithmIds },
        testimony: {
          moderationStatus: 'APPROVED',
          publicPosting: true,
          AND: tokens.map((token) => ({ narrativeText: { contains: token, mode: 'insensitive' } })),
        },
      },
      select: { algorithmId: true },
    }),
  ]);

  const documentAlgorithmIds = new Set(documentMatches.map(({ algorithmId }) => algorithmId));
  const narrativeAlgorithmIds = new Set(narrativeMatches.map(({ algorithmId }) => algorithmId));
  const marker = tokens.join(' ');

  return candidates.map((candidate) => ({
    ...candidate,
    documents: [
      ...candidate.documents,
      ...(documentAlgorithmIds.has(candidate.id) ? [{ rawText: marker }] : []),
    ],
    testimonyLinks: [
      ...candidate.testimonyLinks,
      ...(narrativeAlgorithmIds.has(candidate.id) ? [{ testimony: { narrativeText: marker } }] : []),
    ],
  }));
}
