import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { requireAdmin } from '../../../lib/auth';
import { TransientNotice } from '../../components/TransientNotice';
import { DeleteUserButton } from './DeleteUserButton';
import { RoleSettingsModal } from './RoleSettingsModal';
import { PasswordResetButton } from './PasswordResetButton';
import { EditUserButton } from './UserActions';

export const dynamic = 'force-dynamic';

const notices = {
  'duplicate-role': {
    tone: 'error',
    message: 'One email can only have one user account and one current role.',
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
  'role-protected': {
    tone: 'error',
    message: 'Built-in roles cannot be deleted or renamed.',
  },
  'role-in-use': {
    tone: 'error',
    message: 'Move users to another role before deleting this role.',
  },
  'self-role': {
    tone: 'error',
    message: 'You cannot remove your own admin role.',
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
  const search = String(params?.search || '').trim();
  const admin = await requireAdmin();
  const notice = notices[params?.error] || notices[params?.success];
  const jurisdictionId = getJurisdictionId();
  const [users, roles, organizations] = await Promise.all([
    prisma.user.findMany({
      where: { jurisdictionId },
      orderBy: [{ primaryRoleName: 'asc' }, { email: 'asc' }],
      include: {
        organization: true,
        userRoles: { include: { role: true } },
        passwordResetTokens: {
          where: { expiresAt: { gt: now } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        accounts: { select: { provider: true } },
        _count: { select: { submittedTestimonies: true, comments: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
    prisma.organization.findMany({
      where: { jurisdictionId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
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
  const roleUsers = activeRole === 'ALL'
    ? users
    : users.filter((user) => user.primaryRoleName === activeRole || user.userRoles.some((userRole) => userRole.role.name === activeRole));
  const normalizedSearch = search.toLowerCase();
  const visibleUsers = normalizedSearch
    ? roleUsers.filter((user) => [user.name, user.email, user.organization?.name].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
    : roleUsers;
  const returnTo = userFilterHref(activeRole, search);

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
        <form className="mb-4 flex flex-col gap-2 border-b pb-4 sm:flex-row">
          <input type="hidden" name="role" value={activeRole} />
          <input name="search" defaultValue={search} placeholder="Search name, email, or organization" className="min-h-11 flex-1 rounded-md border px-3 py-2" />
          <button className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Find</button>
          {search ? <Link href={`/admin/users?role=${encodeURIComponent(activeRole)}`} className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold">Clear</Link> : null}
        </form>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={userFilterHref(tab.name, search)}
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
          <p className="text-sm text-slate-500">Showing {visibleUsers.length} of {roleUsers.length} account{roleUsers.length === 1 ? '' : 's'}</p>
        </div>
        <div className="divide-y">
          {visibleUsers.length ? visibleUsers.map((user) => {
            const isCurrentAdmin = user.id === admin.id;
            const currentRoleId = user.userRoles.find((userRole) => userRole.role.name === user.primaryRoleName)?.roleId || user.userRoles[0]?.roleId || '';
            const resetRequested = user.passwordResetTokens.length > 0;
            return (
              <div key={user.id} className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_minmax(180px,0.7fr)_200px] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-slate-950">{user.name}</div>
                    {user.passwordHash ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Password set</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">No password</span>
                    )}
                    {resetRequested ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Reset requested</span>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.emailVerified ? 'Email verified' : 'Email not verified'}
                    </span>
                  </div>
                  <div className="truncate text-sm text-slate-500">{user.email}</div>
                  <div className="mt-1 text-xs text-slate-500">Sign-in: {loginMethods(user).join(', ')}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-slate-700">{user.organization?.name || 'No organization'}</div>
                  <div className="text-slate-500">Created {formatDate(user.createdAt)}</div>
                  <div className="mt-1 text-xs text-slate-500">{user._count.submittedTestimonies} stories / {user._count.comments} comments</div>
                </div>
                <form action={`/api/admin/users/${user.id}/role`} method="post" className="grid gap-2">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="grid w-full gap-1 text-xs font-semibold uppercase text-slate-500">
                    Role
                    <select name="roleId" defaultValue={currentRoleId} className="min-h-10 rounded-md border px-3 py-2 text-sm font-normal normal-case text-slate-900">
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </label>
                  <button className="min-h-10 w-full rounded-md border px-3 py-2 text-sm font-semibold">Update role</button>
                </form>
                <div className="flex w-full flex-col gap-2 xl:justify-self-end">
                  <EditUserButton user={{ id: user.id, name: user.name, organizationId: user.organizationId }} organizations={organizations} />
                  <PasswordResetButton userId={user.id} disabled={isCurrentAdmin} requested={resetRequested} />
                  <form action={`/api/admin/users/${user.id}/delete`} method="post">
                    <input type="hidden" name="returnTo" value={returnTo} />
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

function userFilterHref(role, search) {
  const params = new URLSearchParams({ role });
  if (search) params.set('search', search);
  return `/admin/users?${params.toString()}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function loginMethods(user) {
  const methods = user.accounts.map((account) => formatRole(account.provider));
  if (user.passwordHash) methods.unshift('Email');
  return [...new Set(methods)].length ? [...new Set(methods)] : ['Legacy test account'];
}
