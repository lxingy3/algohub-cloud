import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatStatus } from '../components/Formatters';
import { EventsClient } from './EventsClient';

export const dynamic = 'force-dynamic';

const eventTypeOptions = ['WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER'];

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  const activeFilter = String(params?.filter || 'all');
  const eventType = String(params?.eventType || 'all');
  const initialEventId = String(params?.eventId || '');
  const [user, events] = await Promise.all([
    getCurrentUser(),
    prisma.communityEvent.findMany({
      where: { jurisdictionId: getJurisdictionId() },
      orderBy: { date: 'asc' },
      include: { organizer: true },
    }),
  ]);

  const now = new Date();
  const filteredEvents = events.filter((event) => {
    const isPast = new Date(event.date) < now;
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'upcoming' && !isPast) ||
      (activeFilter === 'past' && isPast);
    const matchesType = eventType === 'all' || event.eventType === eventType;
    return matchesFilter && matchesType;
  });
  const upcomingEvents = filteredEvents.filter((event) => new Date(event.date) >= now);
  const pastEvents = filteredEvents.filter((event) => new Date(event.date) < now);
  const serializeEvent = (event) => ({
    ...event,
    imageUrl: resolveEventImageUrl(event),
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() || null,
    createdAt: event.createdAt?.toISOString() || null,
    organizer: event.organizer ? {
      ...event.organizer,
      createdAt: event.organizer.createdAt?.toISOString() || null,
    } : null,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 220" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.24]">
          <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.1">
            <path d="M0 170 L120 130 L240 160 L350 118 L470 146 L590 108 L720 136 L860 96 L980 130 L1200 84" />
            <path d="M0 210 L130 176 L250 204 L375 166 L505 194 L635 158 L770 188 L900 152 L1040 178 L1200 138" />
          </g>
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <Calendar className="h-8 w-8 text-yellow-300" />
            Community Events
          </h1>
          <p className="mt-2 text-yellow-100/80">Workshops, town halls, and gatherings about algorithms and public services</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 py-6 sm:px-6">
        <div className="space-y-6 rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:p-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Filter</p>
            <div className="flex flex-wrap gap-2">
              <FilterLink active={activeFilter === 'all'} href={`/events?filter=all&eventType=${eventType}`}>All Events</FilterLink>
              <FilterLink active={activeFilter === 'upcoming'} href={`/events?filter=upcoming&eventType=${eventType}`}>Upcoming</FilterLink>
              <FilterLink active={activeFilter === 'past'} href={`/events?filter=past&eventType=${eventType}`}>Past</FilterLink>
            </div>
          </div>
          <form className="flex flex-col gap-2 border-t border-gray-200 pt-6 sm:flex-row sm:items-center">
            <input type="hidden" name="filter" value={activeFilter} />
            <label htmlFor="eventType" className="shrink-0 text-sm font-semibold text-gray-700 sm:w-28">Event Type</label>
            <select id="eventType" name="eventType" defaultValue={eventType} className="min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm sm:w-[220px]">
              <option value="all">All event types</option>
              {eventTypeOptions.map((item) => (
                <option key={item} value={item}>{formatStatus(item)}</option>
              ))}
            </select>
            <button className="min-h-11 w-full rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 shadow-md sm:w-fit">Apply filters</button>
          </form>
        </div>
      </div>

      <section className="mx-auto max-w-4xl space-y-12 px-4 pb-16 sm:px-6">
        <EventsClient
          activeFilter={activeFilter}
          upcomingEvents={upcomingEvents.map(serializeEvent)}
          pastEvents={pastEvents.map(serializeEvent)}
          initialEventId={initialEventId}
        />
      </section>
    </main>
  );
}

function FilterLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-yellow-500 text-gray-900 shadow-md' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
    >
      {children}
    </Link>
  );
}

function resolveEventImageUrl(event) {
  if (!event.imageUrl) return null;
  if (event.imageUrl.startsWith('gcs://')) return `/api/events/${event.id}/image`;
  return event.imageUrl;
}
