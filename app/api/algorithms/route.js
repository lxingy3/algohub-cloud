import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

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
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { agencyName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

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
