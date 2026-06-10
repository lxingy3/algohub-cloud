'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, ExternalLink, MapPin, Video, X } from 'lucide-react';
import { formatDate, formatStatus } from '../components/Formatters';

export function EventsClient({ activeFilter, upcomingEvents, pastEvents }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

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
        {events.length ? events.map((event) => <EventRow key={event.id} event={event} onSelect={onSelect} />) : (
          <div className="py-12 text-center text-gray-500">No events in this section</div>
        )}
      </div>
    </section>
  );
}

function EventRow({ event, onSelect }) {
  const date = new Date(event.date);
  return (
    <article className="group flex flex-col gap-4 rounded-lg px-4 py-5 transition-colors hover:bg-amber-50/35 sm:-mx-4 sm:flex-row sm:gap-6 sm:px-10 sm:py-6">
      <button
        type="button"
        onClick={() => onSelect(event)}
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
              {event.isVirtual ? (
                <span className="inline-flex items-center rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
                  <Video className="mr-1 h-3 w-3" />
                  Virtual
                </span>
              ) : null}
              <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600">{formatStatus(event.eventType)}</span>
            </div>
            <button type="button" onClick={() => onSelect(event)} className="text-left text-lg font-semibold text-gray-900 transition-colors group-hover:text-amber-700">
              {event.title}
            </button>
            {event.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-600">{event.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(new Date(event.date))}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[220px] truncate">{event.isVirtual ? 'Virtual' : event.location || 'Location TBD'}</span>
              </span>
              {event.organizer ? <span>{event.organizer.name}</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(event)}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold hover:border-amber-300 sm:w-auto"
          >
            View details
          </button>
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

  const tags = [
    formatStatus(event.eventType),
    event.isVirtual ? 'Virtual' : 'In person',
    new Date(event.date) < new Date() ? 'Past event' : 'Upcoming',
    event.organizer?.name,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onMouseDown={(eventMouse) => {
        if (eventMouse.target === eventMouse.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-900">{tag}</span>
            ))}
          </div>
          <button type="button" onClick={onClose} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close event details">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">
          <h2 id="event-modal-title" className="text-2xl font-bold leading-tight text-slate-950">{event.title}</h2>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" className="mt-5 max-h-72 w-full rounded-lg border object-cover" />
          ) : null}
          {event.description ? (
            <div className="mt-5 border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm leading-6 text-slate-800">
              {event.description}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 text-sm text-slate-700">
            <InfoRow icon={Calendar} label="Date" value={formatDate(new Date(event.date))} />
            <InfoRow icon={Clock} label="Time" value={formatTimeRange(event)} />
            <InfoRow icon={MapPin} label="Location" value={event.isVirtual ? 'Virtual' : event.location || 'Location TBD'} />
          </div>
          {event.registrationUrl ? (
            <a href={event.registrationUrl} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">
              Register
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
      <div>
        <span className="block text-xs font-semibold uppercase text-slate-500">{label}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function formatTimeRange(event) {
  const date = new Date(event.date);
  const start = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!event.endDate) return start;
  const end = new Date(event.endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${start} - ${end}`;
}
