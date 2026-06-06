import Link from 'next/link';
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
        <DashboardCard href="/admin/algorithms" count={algorithms} label="Algorithms" />
        <DashboardCard href="/admin/testimonies" count={pendingTestimonies} label="Pending testimonies" />
        <DashboardCard href="/admin/comments" count={pendingComments} label="Pending comments" />
        <DashboardCard href="/admin/users" count={users} label="Users" />
      </div>
    </div>
  );
}

function DashboardCard({ href, count, label }) {
  return (
    <Link href={href} className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md">
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </Link>
  );
}
