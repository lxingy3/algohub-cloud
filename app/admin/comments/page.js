import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

const statusOrder = { PENDING: 0, FLAGGED: 1, REJECTED: 2, APPROVED: 3 };
const allowedStatuses = new Set(['PENDING', 'FLAGGED', 'REJECTED', 'APPROVED']);

export default async function AdminCommentsPage({ searchParams }) {
  const params = await searchParams;
  const statusFilter = String(params?.status || '').toUpperCase();
  const where = {
    jurisdictionId: getJurisdictionId(),
    ...(allowedStatuses.has(statusFilter) ? { moderationStatus: statusFilter } : {}),
  };
  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { testimony: true, user: true },
  });
  comments.sort((a, b) => (statusOrder[a.moderationStatus] ?? 9) - (statusOrder[b.moderationStatus] ?? 9) || b.createdAt - a.createdAt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{statusFilter === 'PENDING' ? 'Pending Comment Queue' : 'Comment Queue'}</h1>
        {statusFilter ? (
          <a href="/admin/comments" className="inline-flex min-h-11 items-center rounded-md border bg-white px-3 py-2 text-sm">Show all</a>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {comments.map((comment) => (
          <form key={comment.id} action={`/api/admin/comments/${comment.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
            {statusFilter ? <input type="hidden" name="returnTo" value={`/admin/comments?status=${statusFilter}`} /> : null}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{comment.user?.email || comment.authorName || 'Anonymous'} on {comment.testimony.title}</p>
                <p className="mt-1">{comment.content}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{comment.moderationStatus}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button name="status" value="APPROVED" className="rounded-md border px-3 py-2 text-sm">Approve</button>
              <button name="status" value="FLAGGED" className="rounded-md border px-3 py-2 text-sm">Flag</button>
              <button name="status" value="REJECTED" className="rounded-md border px-3 py-2 text-sm text-red-700">Reject</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
