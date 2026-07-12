import { BookOpenCheck, Building2, CalendarDays, Database, FileClock, MessageSquareText, MessagesSquare } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const jurisdictionId = getJurisdictionId();
  const [testimonyCounts, pendingComments, draftBriefings, algorithms, upcomingEvents, pendingOrganizations] = await Promise.all([
    prisma.testimony.groupBy({
      by: ['moderationStatus'],
      where: { jurisdictionId },
      _count: { moderationStatus: true },
    }),
    prisma.comment.count({ where: { jurisdictionId, moderationStatus: 'PENDING' } }),
    prisma.briefing.count({ where: { jurisdictionId, reviewStatus: 'DRAFT' } }),
    prisma.algorithm.count({ where: { jurisdictionId } }),
    prisma.communityEvent.count({ where: { jurisdictionId, date: { gte: new Date() } } }),
    prisma.organization.count({ where: { jurisdictionId, isActive: false } }),
  ]);
  const storiesByStatus = Object.fromEntries(testimonyCounts.map((item) => [item.moderationStatus, item._count.moderationStatus]));
  const allTestimonies = testimonyCounts.reduce((total, item) => total + item._count.moderationStatus, 0);
  const approvedTestimonies = storiesByStatus.APPROVED || 0;
  const pendingTestimonies = storiesByStatus.PENDING || 0;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Operations</p>
      <h1 className="mt-1 text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Review active records and the queues that need attention.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard href="/admin/algorithms" count={algorithms} label="Algorithms" icon={Database} />
        <DashboardCard href="/admin/testimonies" count={allTestimonies} label="All stories" icon={MessageSquareText} />
        <DashboardCard href="/admin/testimonies?status=APPROVED" count={approvedTestimonies} label="Approved stories" icon={BookOpenCheck} />
        <DashboardCard href="/admin/events?period=upcoming" count={upcomingEvents} label="Upcoming events" icon={CalendarDays} />
        <DashboardCard href="/admin/testimonies?status=PENDING" count={pendingTestimonies} label="Stories awaiting review" icon={MessageSquareText} attention />
        <DashboardCard href="/admin/comments?status=PENDING" count={pendingComments} label="Comments awaiting review" icon={MessagesSquare} attention />
        <DashboardCard href="/admin/briefings?status=DRAFT" count={draftBriefings} label="Briefings awaiting review" icon={FileClock} attention />
        <DashboardCard href="/admin/organizations?status=pending" count={pendingOrganizations} label="Partner applications" icon={Building2} attention={pendingOrganizations > 0} />
      </div>
    </div>
  );
}

function DashboardCard({ href, count, label, icon: Icon, attention = false }) {
  return (
    <a href={href} className={`group relative overflow-hidden rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md ${attention ? 'border-amber-300 bg-amber-50/80' : 'border-slate-200 bg-white'}`}>
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${attention ? 'from-amber-500 via-orange-500 to-rose-500' : 'from-amber-300 via-yellow-500 to-amber-700'}`} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-black text-slate-950">{count}</div>
          <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${attention ? 'bg-white text-orange-700 group-hover:bg-orange-50' : 'bg-amber-50 text-amber-800 group-hover:bg-amber-100'}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </a>
  );
}
