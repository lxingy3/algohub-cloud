import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
  const comments = await prisma.comment.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { testimony: true, user: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Comment Queue</h1>
      <div className="mt-6 space-y-3">
        {comments.map((comment) => (
          <form key={comment.id} action={`/api/admin/comments/${comment.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
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
