import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { jurisdictionId: getJurisdictionId() },
      orderBy: { email: 'asc' },
      include: { userRoles: { include: { role: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">User & Role Manager</h1>
      <div className="mt-6 space-y-3">
        {users.map((user) => (
          <form key={user.id} action={`/api/admin/users/${user.id}/role`} method="post" className="rounded-lg border bg-white p-4">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <select name="roleId" defaultValue={user.userRoles[0]?.roleId || ''} className="mt-3 rounded-md border px-3 py-2">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <button className="ml-2 rounded-md border px-3 py-2 text-sm">Change role</button>
          </form>
        ))}
      </div>
    </div>
  );
}
