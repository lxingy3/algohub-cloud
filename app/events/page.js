import { CalendarDays, MapPin } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatDate, formatStatus } from '../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const [user, events] = await Promise.all([
    getCurrentUser(),
    prisma.communityEvent.findMany({
      where: { jurisdictionId: getJurisdictionId() },
      orderBy: { date: 'asc' },
      include: { organizer: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-stone-900 to-amber-900 text-white">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Workshops and town halls</p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-black">
            <CalendarDays className="h-9 w-9 text-amber-300" />
            Community Events
          </h1>
          <p className="mt-3 max-w-2xl text-amber-50/85">Public sessions connected to testimony collection, algorithm awareness, and partner outreach.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-8 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(event.eventType)}</span>
                <h2 className="mt-4 text-xl font-black">{event.title}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{formatDate(event.date)}</span>
            </div>
            {event.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p> : null}
            <div className="mt-5 space-y-2 text-sm text-slate-500">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600" />
                {event.isVirtual ? 'Virtual' : event.location || 'Location TBD'}
              </p>
              {event.organizer ? <p>Hosted by {event.organizer.name}</p> : null}
            </div>
            {event.registrationUrl ? (
              <a href={event.registrationUrl} className="mt-5 inline-block rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold hover:border-amber-300">
                Register
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
