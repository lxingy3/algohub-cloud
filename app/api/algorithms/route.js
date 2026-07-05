import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { rankAlgorithmsForSearch } from '../../../lib/searchRanking';

export const dynamic = 'force-dynamic';

function getPagination(searchParams) {
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
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
  const search = searchParams.get('search') || '';
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
      include: {
        _count: { select: { testimonyLinks: true } },
        claims: true,
        documents: true,
        testimonyLinks: {
          where: { testimony: { moderationStatus: 'APPROVED' } },
          include: {
            testimony: {
              select: {
                title: true,
                summary: true,
                narrativeText: true,
              },
            },
          },
        },
      },
    });
    const ranked = rankAlgorithmsForSearch(candidates, search);
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
        _count: { select: { testimonyLinks: true } },
      },
    }),
    prisma.algorithm.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}
