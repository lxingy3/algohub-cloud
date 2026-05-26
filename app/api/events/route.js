import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = await prisma.communityEvent.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { date: 'asc' },
    include: { organizer: true },
  });

  return NextResponse.json({ items: events, total: events.length });
}
