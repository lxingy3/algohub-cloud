import Link from 'next/link';
import { Database, Filter, Search } from 'lucide-react';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';
import { formatStatus } from '../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function AlgorithmsPage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.search || '');
  const useCase = String(params?.useCase || 'all');
  const location = String(params?.location || 'all');
  const status = String(params?.status || 'all');
  const impact = String(params?.impact || 'all');
  const sort = String(params?.sort || 'name');
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();

  const where = {
    jurisdictionId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { agencyName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(useCase !== 'all' ? { useCase } : {}),
    ...(location !== 'all' ? { location } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(impact !== 'all' ? { impactLevel: impact } : {}),
  };

  const [algorithms, allAlgorithms] = await Promise.all([
    prisma.algorithm.findMany({
      where,
      orderBy: sort === 'updated' ? { updatedAt: 'desc' } : sort === 'impact' ? { impactLevel: 'asc' } : { name: 'asc' },
      include: {
        _count: { select: { testimonyLinks: true } },
      },
    }),
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      select: { useCase: true, location: true, status: true, impactLevel: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const useCases = [...new Set(allAlgorithms.map((item) => item.useCase).filter(Boolean))];
  const locations = [...new Set(allAlgorithms.map((item) => item.location).filter(Boolean))];
  const statuses = [...new Set(allAlgorithms.map((item) => item.status).filter(Boolean))];
  const impacts = [...new Set(allAlgorithms.map((item) => item.impactLevel).filter(Boolean))];

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-stone-900 to-amber-900 text-white">
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Registry</p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-black">
            <Database className="h-9 w-9 text-amber-300" />
            Algorithm Registry
          </h1>
          <p className="mt-3 max-w-2xl text-amber-50/85">
            Search the documented systems, see where they are used, and follow linked community testimony.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <form className="-mt-14 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search algorithm name, description, or agency"
              className="w-full rounded-md border border-slate-200 bg-white px-10 py-3"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <SelectField name="useCase" label="Use Case" value={useCase} values={useCases} />
            <SelectField name="location" label="Location" value={location} values={locations} />
            <SelectField name="status" label="Status" value={status} values={statuses} formatter={formatStatus} />
            <SelectField name="impact" label="Impact" value={impact} values={impacts} formatter={formatStatus} />
            <label className="text-sm font-medium text-slate-600">
              Sort
              <select name="sort" defaultValue={sort} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950">
                <option value="name">Name</option>
                <option value="updated">Recently updated</option>
                <option value="impact">Impact level</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              Showing {algorithms.length} of {allAlgorithms.length} records
            </div>
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Apply filters</button>
          </div>
        </form>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {algorithms.map((algorithm) => (
            <Link
              key={algorithm.id}
              href={`/algorithms/${algorithm.slug}`}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
                <span className={algorithm._count.testimonyLinks === 0
                  ? 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500'
                  : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800'}
                >
                  {algorithm._count.testimonyLinks} testimonies
                </span>
              </div>
              <h2 className="mt-4 text-lg font-black leading-snug group-hover:text-amber-800">{algorithm.name}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{algorithm.description}</p>
              <dl className="mt-5 grid gap-2 text-xs text-slate-500">
                <div><dt className="font-semibold text-slate-700">Agency</dt><dd>{algorithm.agencyName || 'Not listed'}</dd></div>
                <div><dt className="font-semibold text-slate-700">Use case</dt><dd>{algorithm.useCase}</dd></div>
                <div><dt className="font-semibold text-slate-700">Location</dt><dd>{algorithm.location}</dd></div>
              </dl>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function SelectField({ name, label, value, values, formatter = (item) => item }) {
  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      <select name={name} defaultValue={value} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950">
        <option value="all">All</option>
        {values.map((item) => (
          <option key={item} value={item}>{formatter(item)}</option>
        ))}
      </select>
    </label>
  );
}
