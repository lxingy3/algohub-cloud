import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const events = await prisma.communityEvent.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { date: 'asc' },
    include: { organizer: true },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-blue-700">Back home</Link>
        <h1 className="mt-2 text-3xl font-semibold">Community events</h1>
        <div className="mt-6 space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{event.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.date.toLocaleString()} {event.location ? `at ${event.location}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{event.eventType}</span>
              </div>
              {event.description ? <p className="mt-3 text-sm text-slate-600">{event.description}</p> : null}
              {event.organizer ? <p className="mt-3 text-xs text-slate-500">Hosted by {event.organizer.name}</p> : null}
              {event.registrationUrl ? (
                <a href={event.registrationUrl} className="mt-4 inline-block rounded-md border px-3 py-2 text-sm">
                  Register
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
