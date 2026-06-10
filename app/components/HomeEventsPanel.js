'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { formatDate } from './Formatters';
import { EventModal } from '../events/EventsClient';

export function HomeEventsPanel({ events }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-5 text-white sm:p-8">
      <h3 className="mb-6 text-2xl font-bold">What's Happening?</h3>
      <ul className="space-y-6">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 border-yellow-200 pl-4">
            <button
              type="button"
              onClick={() => setSelectedEvent(event)}
              className="block w-full rounded-md py-1 text-left transition-colors hover:bg-yellow-500/25"
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-100">
                {formatDate(event.date)}
              </div>
              <div className="mb-1 font-semibold text-white">{event.title}</div>
              <p className="text-sm text-yellow-50">{event.organizer?.name || event.location || 'Community event'}</p>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/events" className="mt-8 inline-flex items-center text-sm font-semibold text-white">
        View community events
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
