import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

const briefingSelect = {
  id: true,
  title: true,
  date: true,
  location: true,
  isVirtual: true,
  registrationUrl: true,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get('limit') || 0);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 0), 50)
    : 0;
  const bounded = limit > 0;
  const compact = searchParams.get('projection') === 'briefings';
  const events = await prisma.communityEvent.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { date: 'asc' },
    ...(bounded ? { take: limit } : {}),
    select: compact ? briefingSelect : {
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

  const items = compact
    ? events
    : events.map((event) => ({ ...event, imageUrl: imageUrlForEvent(event) }));
  return NextResponse.json({ items, total: events.length });
}

function imageUrlForEvent(event) {
  if (!event.imageUrl) return null;
  return event.imageUrl.startsWith('gcs://') ? `/api/events/${event.id}/image` : event.imageUrl;
}
