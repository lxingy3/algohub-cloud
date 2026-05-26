import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const jurisdictionId = getJurisdictionId();
  const [pendingTestimonies, pendingComments, users, algorithms] = await Promise.all([
    prisma.testimony.count({ where: { jurisdictionId, moderationStatus: 'PENDING' } }),
    prisma.comment.count({ where: { jurisdictionId, moderationStatus: 'PENDING' } }),
    prisma.user.count({ where: { jurisdictionId } }),
    prisma.algorithm.count({ where: { jurisdictionId } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4"><div className="text-2xl font-bold">{algorithms}</div><div className="text-sm text-slate-500">Algorithms</div></div>
        <div className="rounded-lg border bg-white p-4"><div className="text-2xl font-bold">{pendingTestimonies}</div><div className="text-sm text-slate-500">Pending testimonies</div></div>
        <div className="rounded-lg border bg-white p-4"><div className="text-2xl font-bold">{pendingComments}</div><div className="text-sm text-slate-500">Pending comments</div></div>
        <div className="rounded-lg border bg-white p-4"><div className="text-2xl font-bold">{users}</div><div className="text-sm text-slate-500">Users</div></div>
      </div>
    </div>
  );
}
