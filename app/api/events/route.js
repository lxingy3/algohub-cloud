import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || 0);
  const compact = limit > 0;
  const events = await prisma.communityEvent.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { date: 'asc' },
    ...(compact ? { take: Math.min(Math.max(limit, 1), 50) } : {}),
    ...(compact ? {
      select: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        date: true,
        location: true,
        isVirtual: true,
        registrationUrl: true,
        organizer: { select: { name: true, slug: true } },
      },
    } : { include: { organizer: true } }),
  });

  return NextResponse.json({ items: events, total: events.length });
}
