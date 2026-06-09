import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Organization Manager</h1>
      <form action="/api/admin/organizations" method="post" className="mt-5 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
        <input name="name" placeholder="Name" className="rounded-md border px-3 py-2" required />
        <input name="contactEmail" placeholder="Contact email" className="rounded-md border px-3 py-2" />
        <input name="role" placeholder="Role" className="rounded-md border px-3 py-2" />
        <input name="websiteUrl" placeholder="Website" className="rounded-md border px-3 py-2 md:col-span-3" />
        <textarea name="description" placeholder="Description" className="min-h-24 rounded-md border px-3 py-2 md:col-span-3" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-white md:col-span-3">Add organization</button>
      </form>
      <div className="mt-6 space-y-3">
        {organizations.map((org) => (
          <form key={org.id} action={`/api/admin/organizations/${org.id}`} method="post" className="rounded-lg border bg-white p-4">
            {!org.isActive ? <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Pending partner application</div> : null}
            <input name="name" defaultValue={org.name} className="w-full rounded-md border px-3 py-2" />
            <input name="contactEmail" defaultValue={org.contactEmail || ''} className="mt-2 w-full rounded-md border px-3 py-2" />
            <input name="websiteUrl" defaultValue={org.websiteUrl || ''} placeholder="Website" className="mt-2 w-full rounded-md border px-3 py-2" />
            <textarea name="description" defaultValue={org.description || ''} placeholder="Description or application notes" className="mt-2 min-h-24 w-full rounded-md border px-3 py-2" />
            <div className="mt-2 flex gap-2">
              <button className="rounded-md border px-3 py-2 text-sm">Save</button>
              {!org.isActive ? <button name="action" value="approve" className="rounded-md border px-3 py-2 text-sm text-emerald-700">Approve</button> : null}
              <button name="action" value="delete" className="rounded-md border px-3 py-2 text-sm text-red-700">Delete</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
