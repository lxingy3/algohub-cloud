'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronRight, Clock, Loader2, MapPin, UserPlus, Video, X } from 'lucide-react';
import { formatStatus } from '../components/Formatters';

const eventTimeZone = 'America/New_York';

export function EventsClient({ activeFilter, upcomingEvents, pastEvents, initialEventId, registrationIdentity = null }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const allEvents = useMemo(() => [...upcomingEvents, ...pastEvents], [upcomingEvents, pastEvents]);

  useEffect(() => {
    if (!initialEventId) return;
    const event = allEvents.find((item) => item.id === initialEventId);
    if (event) setSelectedEvent(event);
  }, [allEvents, initialEventId]);

  function openRegistration(event) {
    setSelectedEvent(null);
    setRegistrationEvent(event);
  }

  return (
    <>
      {(activeFilter === 'all' || activeFilter === 'upcoming') ? (
        <EventSection title="Upcoming Events" events={upcomingEvents} onSelect={setSelectedEvent} onRegister={openRegistration} />
      ) : null}
      {(activeFilter === 'all' || activeFilter === 'past') ? (
        <EventSection title="Past Events" events={pastEvents} muted onSelect={setSelectedEvent} />
      ) : null}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onRegister={openRegistration} />
      <RegistrationModal event={registrationEvent} identity={registrationIdentity} onClose={() => setRegistrationEvent(null)} />
    </>
  );
}

function EventSection({ title, events, muted = false, onSelect, onRegister }) {
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
        {events.length ? events.map((event) => <EventRow key={event.id} event={event} muted={muted} onSelect={onSelect} onRegister={onRegister} />) : (
          <div className="py-12 text-center text-gray-500">No events in this section</div>
        )}
      </div>
    </section>
  );
}

function EventRow({ event, muted, onSelect, onRegister }) {
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
        <span className="text-xs font-semibold leading-tight text-yellow-700">{date.toLocaleString('en-US', { month: 'short', timeZone: eventTimeZone })}</span>
        <span className="text-xl font-bold leading-tight text-gray-900">{date.toLocaleString('en-US', { day: 'numeric', timeZone: eventTimeZone })}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {tags.map((tag) => <EventTag key={tag} tag={tag} />)}
            </div>
            <button type="button" onClick={() => onSelect(event)} className="block min-h-11 w-full py-1 text-left text-lg font-semibold leading-tight text-gray-900 transition-colors group-hover:text-amber-700">
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
              {event._count?.registrations ? <span>{event._count.registrations} registered</span> : null}
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {!muted && event.registrationRequired ? (
              <button
                type="button"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onRegister(event);
                }}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:border-amber-300 hover:bg-white sm:w-auto"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Register
              </button>
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

export function EventModal({ event, onClose, onRegister }) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-3 py-3 sm:px-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
      onMouseDown={(eventMouse) => {
        if (eventMouse.target === eventMouse.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh]">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close event details">
            <X className="h-5 w-5" />
        </button>
        <div className="p-4 pr-12 sm:p-8 sm:pr-16">
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
          {event.registrationRequired && new Date(event.date) > new Date() && onRegister ? (
            <button type="button" onClick={() => onRegister(event)} className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 sm:w-auto">
              <UserPlus className="h-4 w-4" />
              Register for this event
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RegistrationModal({ event, identity, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!event) return;
    setName(identity?.name || '');
    setEmail(identity?.email || '');
    setStatus('idle');
    setError('');
  }, [event, identity]);

  useEffect(() => {
    if (!event) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [event, onClose]);

  if (!event) return null;

  async function submitRegistration(formEvent) {
    formEvent.preventDefault();
    setStatus('saving');
    setError('');
    const response = await fetch(`/api/events/${event.id}/registrations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus('idle');
      setError(result.error || 'Registration could not be completed.');
      return;
    }
    setStatus(result.alreadyRegistered ? 'already-registered' : 'registered');
  }

  const completed = status === 'registered' || status === 'already-registered';
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-3 py-4 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-registration-title"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close event registration">
          <X className="h-5 w-5" />
        </button>
        {completed ? (
          <div className="py-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 id="event-registration-title" className="mt-4 text-2xl font-bold text-slate-950">
              {status === 'already-registered' ? 'You are already registered' : 'Registration confirmed'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{event.title}</p>
            <button type="button" onClick={onClose} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Event registration</p>
            <h2 id="event-registration-title" className="mt-2 pr-10 text-2xl font-bold leading-tight text-slate-950">{event.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{formatFullDate(event.date)} · {formatTimeRange(event)}</p>
            <form onSubmit={submitRegistration} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input value={name} onChange={(changeEvent) => setName(changeEvent.target.value)} name="name" minLength={2} maxLength={120} autoComplete="name" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input value={email} onChange={(changeEvent) => setEmail(changeEvent.target.value)} name="email" type="email" maxLength={255} autoComplete="email" required className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </label>
              {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
              <button disabled={status === 'saving'} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-yellow-500 px-4 py-2 font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-70">
                {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {status === 'saving' ? 'Registering...' : 'Confirm registration'}
              </button>
            </form>
          </>
        )}
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
    'Understanding Automated Benefits Decisions': ['Workshop', 'Benefits', 'Appeals'],
    'Housing Algorithms Community Listening Session': ['Town Hall', 'Housing', 'Community'],
    'Transit Reporting and Data Correction Clinic': ['Workshop', 'Transit', 'Data Rights'],
    'Youth Data Rights Workshop': ['Workshop', 'Youth', 'Education'],
    'Public Service AI Accountability Roundtable': ['Panel', 'Policy', 'Accountability'],
    'Language Access and Automated Services Clinic': ['Clinic', 'Language Access', 'Community'],
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
    timeZone: eventTimeZone,
  }).format(new Date(value));
}

function formatTimeRange(event) {
  const date = new Date(event.date);
  const start = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: eventTimeZone });
  if (!event.endDate) return start;
  const end = new Date(event.endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: eventTimeZone });
  return `${start} - ${end}`;
}
