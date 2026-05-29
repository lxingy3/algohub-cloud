import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminTestimoniesPage() {
  const testimonies = await prisma.testimony.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { submittedAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Testimony Queue</h1>
      <div className="mt-6 space-y-3">
        {testimonies.map((testimony) => (
          <form key={testimony.id} action={`/api/admin/testimonies/${testimony.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
              <div>
                <h2 className="font-semibold">{testimony.title || 'Untitled testimony'}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{testimony.summary || testimony.narrativeText}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{testimony.moderationStatus}</span>
            </div>
            <textarea name="notes" placeholder="Moderation notes" defaultValue={testimony.moderationNotes || ''} className="mt-3 w-full rounded-md border px-3 py-2" />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button name="status" value="APPROVED" className="min-h-11 rounded-md border px-3 py-2 text-sm">Approve</button>
              <button name="status" value="FLAGGED" className="min-h-11 rounded-md border px-3 py-2 text-sm">Flag</button>
              <button name="status" value="REJECTED" className="min-h-11 rounded-md border px-3 py-2 text-sm text-red-700">Reject</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
