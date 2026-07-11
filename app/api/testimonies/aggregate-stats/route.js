import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jurisdictionId = getJurisdictionId();
  const [total, domains, algorithms] = await Promise.all([
    prisma.testimony.count({ where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true } }),
    prisma.testimony.groupBy({
      by: ['affectedDomain'],
      where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true, affectedDomain: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { affectedDomain: 'desc' } },
      take: 10,
    }),
    prisma.testimonyAlgorithmLink.groupBy({
      by: ['algorithmId'],
      where: { testimony: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true } },
      _count: { _all: true },
      orderBy: { _count: { algorithmId: 'desc' } },
      take: 10,
    }),
  ]);

  return NextResponse.json({ total, domains, algorithms });
}
