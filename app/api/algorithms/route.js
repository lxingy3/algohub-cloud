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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jurisdictionId = getJurisdictionId();
  const { page, limit, skip } = getPagination(searchParams);
  const search = searchParams.get('search') || '';
  const useCase = searchParams.get('use_case') || '';
  const location = searchParams.get('location') || '';

  const where = {
    jurisdictionId,
    ...(useCase ? { useCase } : {}),
    ...(location ? { location } : {}),
  };

  if (search) {
    const candidates = await prisma.algorithm.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { testimonyLinks: true } },
        claims: true,
        documents: true,
      },
    });
    const ranked = rankAlgorithmsForSearch(candidates, search);
    const items = ranked.slice(skip, skip + limit).map((algorithm) => {
      const item = { ...algorithm };
      delete item.claims;
      delete item.documents;
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
