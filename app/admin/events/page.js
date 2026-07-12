import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { AdminEventsManager } from './AdminEventsManager';

export const dynamic = 'force-dynamic';

const eventTypes = ['WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER'];

export default async function AdminEventsPage({ searchParams }) {
  const params = await searchParams;
  const jurisdictionId = getJurisdictionId();
  const search = String(params?.search || '').trim();
  const period = ['upcoming', 'past'].includes(String(params?.period || '')) ? String(params.period) : 'all';
  const eventType = eventTypes.includes(String(params?.eventType || '')) ? String(params.eventType) : 'all';
  const format = ['virtual', 'in-person'].includes(String(params?.format || '')) ? String(params.format) : 'all';
  const requestedOrganizer = String(params?.organizer || 'all');
  const organizer = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedOrganizer) ? requestedOrganizer : 'all';
  const now = new Date();
  const where = {
    jurisdictionId,
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(period === 'upcoming' ? { date: { gte: now } } : {}),
    ...(period === 'past' ? { date: { lt: now } } : {}),
    ...(eventType !== 'all' ? { eventType } : {}),
    ...(format === 'virtual' ? { isVirtual: true } : {}),
    ...(format === 'in-person' ? { isVirtual: false } : {}),
    ...(organizer !== 'all' ? { organizerOrgId: organizer } : {}),
  };
  const [events, organizations, allEvents] = await Promise.all([
    prisma.communityEvent.findMany({
      where,
      orderBy: { date: period === 'upcoming' ? 'asc' : 'desc' },
      take: 50,
      include: { organizer: true },
    }),
    prisma.organization.findMany({
      where: { jurisdictionId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.communityEvent.findMany({
      where: { jurisdictionId },
      select: { eventType: true },
    }),
  ]);
  const availableEventTypes = eventTypes.filter((type) => allEvents.some((event) => event.eventType === type));
  const filters = { search, period, eventType, format, organizer };

  return (
    <AdminEventsManager
      events={events.map(serializeEvent)}
      organizations={organizations}
      eventTypes={availableEventTypes}
      filters={filters}
      totalCount={allEvents.length}
      returnTo={buildEventsHref(filters)}
    />
  );
}

function buildEventsHref(filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.period !== 'all') params.set('period', filters.period);
  if (filters.eventType !== 'all') params.set('eventType', filters.eventType);
  if (filters.format !== 'all') params.set('format', filters.format);
  if (filters.organizer !== 'all') params.set('organizer', filters.organizer);
  const query = params.toString();
  return `/admin/events${query ? `?${query}` : ''}`;
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
