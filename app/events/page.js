import Link from 'next/link';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatDate, formatStatus } from '../components/Formatters';

export const dynamic = 'force-dynamic';

const eventTypeOptions = ['WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER'];

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  const activeFilter = String(params?.filter || 'all');
  const eventType = String(params?.eventType || 'all');
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
        {(activeFilter === 'all' || activeFilter === 'upcoming') ? <EventSection title="Upcoming Events" events={upcomingEvents} /> : null}
        {(activeFilter === 'all' || activeFilter === 'past') ? <EventSection title="Past Events" events={pastEvents} muted /> : null}
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

function EventSection({ title, events, muted = false }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white/70 px-6 py-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Calendar className={`h-5 w-5 ${muted ? 'text-gray-400' : 'text-yellow-600'}`} />
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">{events.length} {events.length === 1 ? 'event' : 'events'}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {events.length ? events.map((event) => <EventRow key={event.id} event={event} />) : (
          <div className="py-12 text-center text-gray-500">No events in this section</div>
        )}
      </div>
    </section>
  );
}

function EventRow({ event }) {
  const date = new Date(event.date);
  return (
    <article className="group flex cursor-default flex-col gap-4 rounded-lg px-4 py-5 transition-colors hover:bg-amber-50/35 sm:-mx-4 sm:flex-row sm:gap-6 sm:px-10 sm:py-6">
      <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-yellow-300 bg-amber-50">
        <span className="text-xs font-semibold leading-tight text-yellow-700">{date.toLocaleString('en-US', { month: 'short' })}</span>
        <span className="text-xl font-bold leading-tight text-gray-900">{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {event.isVirtual ? (
                <span className="inline-flex items-center rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
                  <Video className="mr-1 h-3 w-3" />
                  Virtual
                </span>
              ) : null}
              <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600">{formatStatus(event.eventType)}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-amber-700">{event.title}</h3>
            {event.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[220px] truncate">{event.isVirtual ? 'Virtual' : event.location || 'Location TBD'}</span>
              </span>
              {event.organizer ? <span>{event.organizer.name}</span> : null}
            </div>
          </div>
          {event.registrationUrl ? (
            <a href={event.registrationUrl} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:border-amber-300 sm:w-auto">
              Register
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
