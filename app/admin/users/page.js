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
      <section className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Roles</h2>
        <form action="/api/admin/roles" method="post" className="mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto]">
          <input name="name" placeholder="Role name" className="rounded-md border px-3 py-2" required />
          <input name="description" placeholder="Description" className="rounded-md border px-3 py-2" />
          <button className="rounded-md border px-3 py-2 text-sm">Add role</button>
        </form>
        <div className="mt-4 grid gap-3">
          {roles.map((role) => (
            <form key={role.id} action={`/api/admin/roles/${role.id}`} method="post" className="grid gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-[220px_1fr_auto_auto]">
              <input name="name" defaultValue={role.name} className="rounded-md border bg-white px-3 py-2" required />
              <input name="description" defaultValue={role.description || ''} className="rounded-md border bg-white px-3 py-2" />
              <button name="action" value="update" className="rounded-md border bg-white px-3 py-2 text-sm">Save</button>
              <button name="action" value="delete" className="rounded-md border bg-white px-3 py-2 text-sm">Delete</button>
            </form>
          ))}
        </div>
      </section>

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
