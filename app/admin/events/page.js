import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { AdminEventsManager } from './AdminEventsManager';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const jurisdictionId = getJurisdictionId();
  const [events, organizations] = await Promise.all([
    prisma.communityEvent.findMany({
      where: { jurisdictionId },
      orderBy: { date: 'desc' },
      take: 50,
      include: { organizer: true },
    }),
    prisma.organization.findMany({
      where: { jurisdictionId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AdminEventsManager
      events={events.map(serializeEvent)}
      organizations={organizations}
    />
  );
}

function serializeEvent(event) {
  return {
    ...event,
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() || null,
    createdAt: event.createdAt?.toISOString() || null,
    imagePreviewUrl: event.imageUrl?.startsWith('gcs://') ? `/api/events/${event.id}/image` : event.imageUrl,
    organizer: event.organizer ? {
      ...event.organizer,
      createdAt: event.organizer.createdAt?.toISOString() || null,
    } : null,
  };
}
