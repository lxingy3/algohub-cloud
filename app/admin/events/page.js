import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const events = await prisma.communityEvent.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { date: 'desc' },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Community Events Manager</h1>
      <form action="/api/admin/events" method="post" className="mt-5 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
        <input name="title" placeholder="Title" className="rounded-md border px-3 py-2" required />
        <input name="date" type="datetime-local" className="rounded-md border px-3 py-2" required />
        <input name="location" placeholder="Location" className="rounded-md border px-3 py-2" />
        <input name="registrationUrl" placeholder="Registration URL" className="rounded-md border px-3 py-2" />
        <textarea name="description" placeholder="Description" className="rounded-md border px-3 py-2 md:col-span-2" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-white md:col-span-2">Add event</button>
      </form>

      <div className="mt-6 space-y-3">
        {events.map((event) => (
          <form key={event.id} action={`/api/admin/events/${event.id}`} method="post" className="rounded-lg border bg-white p-4">
            <input name="title" defaultValue={event.title} className="w-full rounded-md border px-3 py-2" />
            <input name="date" type="datetime-local" defaultValue={event.date.toISOString().slice(0, 16)} className="mt-2 rounded-md border px-3 py-2" />
            <div className="mt-2 flex gap-2">
              <button className="rounded-md border px-3 py-2 text-sm">Save</button>
              <button name="action" value="delete" className="rounded-md border px-3 py-2 text-sm text-red-700">Delete</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
