import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { formatStatus } from '../../components/Formatters';

export const dynamic = 'force-dynamic';

const statuses = ['ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED'];
const impacts = ['', 'LOW', 'MEDIUM', 'HIGH'];

export default async function AdminAlgorithmsPage({ searchParams }) {
  const params = await searchParams;
  const jurisdictionId = getJurisdictionId();
  const search = String(params?.search || '').trim();
  const useCase = String(params?.useCase || 'all');
  const location = String(params?.location || 'all');
  const status = String(params?.status || 'all');

  const where = {
    jurisdictionId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { agencyName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(useCase !== 'all' ? { useCase } : {}),
    ...(location !== 'all' ? { location } : {}),
    ...(status !== 'all' ? { status } : {}),
  };

  const [algorithms, allAlgorithms] = await Promise.all([
    prisma.algorithm.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { claims: { orderBy: { createdAt: 'asc' }, take: 1 } },
    }),
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      select: { useCase: true, location: true, status: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const useCases = [...new Set(allAlgorithms.map((item) => item.useCase).filter(Boolean))];
  const locations = [...new Set(allAlgorithms.map((item) => item.location).filter(Boolean))];
  const statusOptions = [...new Set(allAlgorithms.map((item) => item.status).filter(Boolean))];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Algorithm Manager</h1>

      <section className="mt-5 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Add Algorithm</h2>
        <AlgorithmFields action="/api/admin/algorithms" submitLabel="Add algorithm" />
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Edit Existing Algorithms</h2>
            <p className="mt-1 text-sm text-slate-500">Search or classify records before choosing one to edit.</p>
          </div>
          <div className="text-sm text-slate-500">Showing {algorithms.length} of {allAlgorithms.length}</div>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px_170px_auto]">
          <input name="search" defaultValue={search} placeholder="Search name, agency, or description" className="rounded-md border px-3 py-2" />
          <select name="useCase" defaultValue={useCase} className="rounded-md border px-3 py-2">
            <option value="all">All use cases</option>
            {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="location" defaultValue={location} className="rounded-md border px-3 py-2">
            <option value="all">All locations</option>
            {locations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="status" defaultValue={status} className="rounded-md border px-3 py-2">
            <option value="all">All statuses</option>
            {statusOptions.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
          </select>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white">Find</button>
        </form>
      </section>

      <div className="mt-6 space-y-4">
        {algorithms.map((algorithm) => (
          <details key={algorithm.id} className="rounded-lg border bg-white p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{algorithm.name}</h3>
                  <p className="text-sm text-slate-500">{algorithm.agencyName || 'No agency'} / {algorithm.useCase} / {algorithm.location}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
                  {algorithm.impactLevel ? <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{formatStatus(algorithm.impactLevel)} impact</span> : null}
                  <span className="rounded-md border px-2 py-1">Edit algorithm</span>
                </div>
              </div>
            </summary>
            <AlgorithmFields
              action={`/api/admin/algorithms/${algorithm.id}`}
              submitLabel="Save changes"
              algorithm={algorithm}
              claim={algorithm.claims[0]}
            />
          </details>
        ))}
      </div>
    </div>
  );
}

function AlgorithmFields({ action, submitLabel, algorithm = {}, claim = null }) {
  return (
    <form action={action} method="post" className="mt-4 grid gap-3 md:grid-cols-2">
      {claim?.id ? <input type="hidden" name="claimId" value={claim.id} /> : null}
      <Field name="name" label="Name" value={algorithm.name} required />
      <Field name="slug" label="Slug" value={algorithm.slug} />
      <Field name="agencyName" label="Agency / Used by" value={algorithm.agencyName} />
      <Field name="agencyType" label="Agency type" value={algorithm.agencyType} />
      <Field name="useCase" label="Use case" value={algorithm.useCase} />
      <Field name="location" label="Location" value={algorithm.location} />
      <label className="text-sm font-medium text-slate-600">
        Status
        <select name="status" defaultValue={algorithm.status || 'ACTIVE'} className="mt-1 w-full rounded-md border px-3 py-2">
          {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-600">
        Impact level
        <select name="impactLevel" defaultValue={algorithm.impactLevel || ''} className="mt-1 w-full rounded-md border px-3 py-2">
          {impacts.map((impact) => <option key={impact || 'none'} value={impact}>{impact ? formatStatus(impact) : 'Not listed'}</option>)}
        </select>
      </label>
      <Field name="yearIntroduced" label="Year introduced" value={algorithm.yearIntroduced} type="number" />
      <Field name="yearDeployed" label="Year deployed" value={algorithm.yearDeployed} type="number" />
      <Field name="currentVersion" label="Current version" value={algorithm.currentVersion} />
      <Field name="officialDocumentationUrl" label="Official documentation URL" value={algorithm.officialDocumentationUrl} />
      <TextField name="description" label="Description" value={algorithm.description} />
      <TextField name="purpose" label="Purpose" value={algorithm.purpose} />
      <TextField name="dataUsed" label="Data used" value={algorithm.dataUsed} />
      <TextField name="decisionType" label="Decision type" value={algorithm.decisionType} />
      <TextField name="storyboardSvg" label="Storyboard SVG / URL" value={algorithm.storyboardSvg} />
      <TextField name="claimText" label="Official claim" value={claim?.claimText} />
      <Field name="claimSource" label="Claim source" value={claim?.claimSource} />
      <div className="flex gap-2 md:col-span-2">
        <button name="action" value="update" className="rounded-md bg-slate-900 px-4 py-2 text-white">{submitLabel}</button>
        {algorithm.id ? <button name="action" value="delete" className="rounded-md border border-red-200 px-4 py-2 text-red-700">Delete</button> : null}
      </div>
    </form>
  );
}

function Field({ name, label, value = '', type = 'text', required = false }) {
  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      <input name={name} type={type} defaultValue={value || ''} className="mt-1 w-full rounded-md border px-3 py-2" required={required} />
    </label>
  );
}

function TextField({ name, label, value = '' }) {
  return (
    <label className="text-sm font-medium text-slate-600 md:col-span-2">
      {label}
      <textarea name={name} defaultValue={value || ''} rows={3} className="mt-1 w-full rounded-md border px-3 py-2" />
    </label>
  );
}
