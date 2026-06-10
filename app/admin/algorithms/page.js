import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { formatStatus } from '../../components/Formatters';
import { AddAlgorithmForm, AdminAlgorithmCard } from './AdminAlgorithmForms';

export const dynamic = 'force-dynamic';

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

  const [currentUser, algorithms, allAlgorithms] = await Promise.all([
    getCurrentUser(),
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
        <AddAlgorithmForm currentRole={currentUser?.primaryRoleName || 'ADMIN'} />
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
          <AdminAlgorithmCard key={algorithm.id} algorithm={JSON.parse(JSON.stringify(algorithm))} />
        ))}
      </div>
    </div>
  );
}
