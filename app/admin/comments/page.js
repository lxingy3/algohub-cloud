import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import {
  allowedModerationActions,
  isModerationStatus,
  moderationStatusOrder,
  moderationStatuses,
} from '../../../lib/moderation';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage({ searchParams }) {
  const params = await searchParams;
  const statusFilter = String(params?.status || '').toUpperCase();
  const jurisdictionId = getJurisdictionId();
  const where = {
    jurisdictionId,
    ...(isModerationStatus(statusFilter) ? { moderationStatus: statusFilter } : {}),
  };
  const [comments, statusCounts] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { testimony: true, user: true },
    }),
    prisma.comment.groupBy({
      by: ['moderationStatus'],
      where: { jurisdictionId },
      _count: { moderationStatus: true },
    }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((item) => [item.moderationStatus, item._count.moderationStatus]));
  comments.sort((a, b) => (moderationStatusOrder[a.moderationStatus] ?? 9) - (moderationStatusOrder[b.moderationStatus] ?? 9) || b.createdAt - a.createdAt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{statusFilter === 'PENDING' ? 'Pending Comment Queue' : 'Comment Queue'}</h1>
        {isModerationStatus(statusFilter) ? (
          <a href="/admin/comments" className="inline-flex min-h-11 items-center rounded-md border bg-white px-3 py-2 text-sm">Show all</a>
        ) : null}
      </div>
      <StatusTabs baseHref="/admin/comments" activeStatus={statusFilter} counts={counts} />
      <div className="mt-6 space-y-3">
        {comments.map((comment) => (
          <form key={comment.id} action={`/api/admin/comments/${comment.id}/moderate`} method="post" className="rounded-lg border bg-white p-4">
            {isModerationStatus(statusFilter) ? <input type="hidden" name="returnTo" value={`/admin/comments?status=${statusFilter}`} /> : null}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{comment.user?.email || comment.authorName || 'Anonymous'} on {comment.testimony.title}</p>
                <p className="mt-1">{comment.content}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{comment.moderationStatus}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {allowedModerationActions(comment.moderationStatus).map(([nextStatus, label]) => (
                <button key={nextStatus} name="status" value={nextStatus} className={`min-h-11 rounded-md border px-3 py-2 text-sm ${nextStatus === 'REJECTED' ? 'text-red-700' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          </form>
        ))}
        {!comments.length ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">No comments are in this queue.</div>
        ) : null}
      </div>
    </div>
  );
}

function StatusTabs({ baseHref, activeStatus, counts }) {
  const allCount = moderationStatuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto rounded-lg border bg-white p-2" aria-label="Moderation status">
      <a
        href={baseHref}
        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${!activeStatus ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        All
        <span className={`rounded-full px-2 py-0.5 text-xs ${!activeStatus ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{allCount}</span>
      </a>
      {moderationStatuses.map((status) => {
        const active = activeStatus === status;
        return (
          <a
            key={status}
            href={active ? baseHref : `${baseHref}?status=${status}`}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {formatStatusLabel(status)}
            <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{counts[status] || 0}</span>
          </a>
        );
      })}
    </nav>
  );
}

function formatStatusLabel(status) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
