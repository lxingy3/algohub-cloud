import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { requireAdmin } from '../../../lib/auth';
import { TransientNotice } from '../../components/TransientNotice';
import { DeleteUserButton } from './DeleteUserButton';
import { RoleSettingsModal } from './RoleSettingsModal';
import { PasswordResetButton } from './PasswordResetButton';

export const dynamic = 'force-dynamic';

const notices = {
  'duplicate-role': {
    tone: 'error',
    message: 'One email cannot have two accounts with the same role. Choose another role or delete one of the duplicate accounts.',
  },
  'self-delete': {
    tone: 'error',
    message: 'You cannot delete the admin account you are currently using.',
  },
  'delete-failed': {
    tone: 'error',
    message: 'The user could not be deleted. Please try again.',
  },
  'role-missing': {
    tone: 'error',
    message: 'The selected role could not be found.',
  },
  'role-updated': {
    tone: 'success',
    message: 'User role updated.',
  },
  deleted: {
    tone: 'success',
    message: 'User account deleted.',
  },
};

const preferredRoles = ['ADMIN', 'COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER'];

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;
  const activeRole = String(params?.role || 'ALL');
  const admin = await requireAdmin();
  const notice = notices[params?.error] || notices[params?.success];
  const jurisdictionId = getJurisdictionId();
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { jurisdictionId },
      orderBy: [{ primaryRoleName: 'asc' }, { email: 'asc' }],
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const roleNames = [
    ...preferredRoles.filter((roleName) => roles.some((role) => role.name === roleName) || users.some((user) => user.primaryRoleName === roleName)),
    ...roles.map((role) => role.name).filter((roleName) => !preferredRoles.includes(roleName)),
  ];
  const tabs = [
    { name: 'ALL', label: 'All', count: users.length },
    ...roleNames.map((roleName) => ({
      name: roleName,
      label: formatRole(roleName),
      count: users.filter((user) => user.primaryRoleName === roleName || user.userRoles.some((userRole) => userRole.role.name === roleName)).length,
    })),
  ];
  const visibleUsers = activeRole === 'ALL'
    ? users
    : users.filter((user) => user.primaryRoleName === activeRole || user.userRoles.some((userRole) => userRole.role.name === activeRole));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User & Role Manager</h1>
        </div>
        <RoleSettingsModal roles={roles.map(serializeRole)} />
      </div>
      <TransientNotice message={notice?.message} tone={notice?.tone} />

      <section className="mt-6 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={`/admin/users?role=${encodeURIComponent(tab.name)}`}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${activeRole === tab.name ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeRole === tab.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{activeRole === 'ALL' ? 'All users' : `${formatRole(activeRole)} users`}</h2>
          <p className="text-sm text-slate-500">{visibleUsers.length} account{visibleUsers.length === 1 ? '' : 's'}</p>
        </div>
        <div className="divide-y">
          {visibleUsers.length ? visibleUsers.map((user) => {
            const isCurrentAdmin = user.id === admin.id;
            const currentRoleId = user.userRoles.find((userRole) => userRole.role.name === user.primaryRoleName)?.roleId || user.userRoles[0]?.roleId || '';
            return (
              <div key={user.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.4fr_1fr_0.9fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-950">{user.name}</div>
                    {user.passwordHash ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Password set</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">No password</span>
                    )}
                  </div>
                  <div className="truncate text-sm text-slate-500">{user.email}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-slate-700">{user.organization?.name || 'No organization'}</div>
                  <div className="text-slate-500">Created {formatDate(user.createdAt)}</div>
                </div>
                <form action={`/api/admin/users/${user.id}/role`} method="post" className="flex flex-col gap-2 sm:flex-row">
                  <select name="roleId" defaultValue={currentRoleId} className="min-h-10 rounded-md border px-3 py-2 text-sm">
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button className="min-h-10 rounded-md border px-3 py-2 text-sm font-semibold">Save</button>
                </form>
                <div className="flex flex-col gap-2 lg:justify-self-end">
                  {user.passwordHash ? <PasswordResetButton userId={user.id} disabled={isCurrentAdmin} /> : null}
                  <form action={`/api/admin/users/${user.id}/delete`} method="post">
                    <DeleteUserButton disabled={isCurrentAdmin} />
                  </form>
                </div>
              </div>
            );
          }) : (
            <div className="px-4 py-12 text-center text-sm text-slate-500">No users in this role.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function serializeRole(role) {
  return {
    ...role,
    createdAt: role.createdAt?.toISOString?.() || null,
    updatedAt: role.updatedAt?.toISOString?.() || null,
  };
}

function formatRole(value) {
  return value.split('_').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
