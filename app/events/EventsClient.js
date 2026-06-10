'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Clock, ExternalLink, MapPin, Video, X } from 'lucide-react';
import { formatStatus } from '../components/Formatters';

export function EventsClient({ activeFilter, upcomingEvents, pastEvents, initialEventId }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const allEvents = useMemo(() => [...upcomingEvents, ...pastEvents], [upcomingEvents, pastEvents]);

  useEffect(() => {
    if (!initialEventId) return;
    const event = allEvents.find((item) => item.id === initialEventId);
    if (event) setSelectedEvent(event);
  }, [allEvents, initialEventId]);

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'upcoming') ? (
        <EventSection title="Upcoming Events" events={upcomingEvents} onSelect={setSelectedEvent} />
      ) : null}
      {(activeFilter === 'all' || activeFilter === 'past') ? (
        <EventSection title="Past Events" events={pastEvents} muted onSelect={setSelectedEvent} />
      ) : null}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}

function EventSection({ title, events, muted = false, onSelect }) {
  const countText = muted
    ? `${events.length} past ${events.length === 1 ? 'event' : 'events'}`
    : `${events.length} ${events.length === 1 ? 'event' : 'events'} coming up`;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white/70 px-6 py-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Calendar className={`h-5 w-5 ${muted ? 'text-gray-400' : 'text-yellow-600'}`} />
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">{countText}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {events.length ? events.map((event) => <EventRow key={event.id} event={event} onSelect={onSelect} />) : (
          <div className="py-12 text-center text-gray-500">No events in this section</div>
        )}
      </div>
    </section>
  );
}

function EventRow({ event, onSelect }) {
  const date = new Date(event.date);
  const tags = getEventTags(event);
  const location = event.isVirtual ? 'Virtual' : event.location || 'Location TBD';

  return (
    <article
      className="group flex cursor-pointer flex-col gap-4 rounded-lg px-4 py-5 transition-colors hover:bg-amber-50/35 sm:-mx-4 sm:flex-row sm:gap-6 sm:px-8 sm:py-6"
      onClick={() => onSelect(event)}
    >
      <button
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelect(event);
        }}
        className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-yellow-300 bg-amber-50 text-left"
        aria-label={`View details for ${event.title}`}
      >
        <span className="text-xs font-semibold leading-tight text-yellow-700">{date.toLocaleString('en-US', { month: 'short' })}</span>
        <span className="text-xl font-bold leading-tight text-gray-900">{date.getDate()}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {tags.map((tag) => <EventTag key={tag} tag={tag} />)}
            </div>
            <button type="button" onClick={() => onSelect(event)} className="text-left text-lg font-semibold text-gray-900 transition-colors group-hover:text-amber-700">
              {event.title}
            </button>
            {event.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRange(event)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[220px] truncate">{location}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:border-amber-300 hover:bg-white sm:w-auto"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Register
              </a>
            ) : null}
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onSelect(event);
              }}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-gray-400 transition-colors group-hover:text-amber-700"
              aria-label={`Open details for ${event.title}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function EventModal({ event, onClose }) {
  useEffect(() => {
    if (!event) return undefined;
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [event, onClose]);

  if (!event) return null;

  const tags = getEventTags(event);
  const location = event.isVirtual ? 'Virtual' : event.location || 'Location TBD';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onMouseDown={(eventMouse) => {
        if (eventMouse.target === eventMouse.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close event details">
            <X className="h-5 w-5" />
        </button>
        <div className="p-6 pr-14 sm:p-8 sm:pr-16">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => <EventTag key={tag} tag={tag} />)}
          </div>
          <h2 id="event-modal-title" className="mt-5 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{event.title}</h2>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" className="mt-8 h-56 w-full rounded-md object-cover sm:h-64" />
          ) : null}
          {event.description ? (
            <p className="mt-7 border-l-4 border-yellow-500 pl-5 text-lg leading-8 text-slate-600">
              {event.description}
            </p>
          ) : null}
          <div className="mt-7 space-y-4 text-base text-slate-600">
            <InfoRow icon={Calendar} value={formatFullDate(event.date)} />
            <InfoRow icon={Clock} value={formatTimeRange(event)} />
            <InfoRow icon={MapPin} value={location} />
          </div>
          {event.registrationUrl ? (
            <a href={event.registrationUrl} className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 sm:w-auto">
              <ExternalLink className="h-4 w-4" />
              Register for this event
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EventTag({ tag }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
      {tag === 'Virtual' ? <Video className="mr-1 h-3 w-3" /> : null}
      {tag}
    </span>
  );
}

function InfoRow({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 shrink-0 text-yellow-600" />
      <span>{value}</span>
    </div>
  );
}

function getEventTags(event) {
  const knownTags = {
    'Community Data Rights 101': ['Workshop', 'Privacy', 'Education'],
    'AlgoStories Town Hall: Housing Voucher Algorithm': ['Virtual', 'Town Hall', 'Housing', 'Community'],
    'Youth & Algorithms: Know Your Rights': ['Youth', 'Education', 'Rights'],
    'Open Office Hours: Ask AlgoStories': ['Q&A', 'Virtual', 'Drop-in'],
    'Language Access Listening Session': ['Town Hall'],
    'Worker Rights and Algorithmic Enforcement Roundtable': ['Panel'],
  };
  if (knownTags[event.title]) return knownTags[event.title];

  const tags = [];
  if (event.isVirtual) tags.push('Virtual');
  if (event.eventType) tags.push(formatStatus(event.eventType));
  return [...new Set(tags)];
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTimeRange(event) {
  const date = new Date(event.date);
  const start = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!event.endDate) return start;
  const end = new Date(event.endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${start} - ${end}`;
}
