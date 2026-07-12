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
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      date: true,
      endDate: true,
      location: true,
      isVirtual: true,
      virtualLink: true,
      maxAttendees: true,
      registrationRequired: true,
      registrationUrl: true,
      imageUrl: true,
      organizer: { select: { name: true, slug: true, websiteUrl: true, logoUrl: true } },
      _count: { select: { registrations: true } },
    },
  });

  return NextResponse.json({ items: events.map((event) => ({ ...event, imageUrl: imageUrlForEvent(event) })), total: events.length });
}

function imageUrlForEvent(event) {
  if (!event.imageUrl) return null;
  return event.imageUrl.startsWith('gcs://') ? `/api/events/${event.id}/image` : event.imageUrl;
}
