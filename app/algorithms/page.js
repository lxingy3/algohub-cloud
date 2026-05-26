import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AlgorithmsPage({ searchParams }) {
  const params = await searchParams;
  const search = params?.search || '';
  const jurisdictionId = getJurisdictionId();

  const algorithms = await prisma.algorithm.findMany({
    where: {
      jurisdictionId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { testimonyLinks: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-700">Back home</Link>
            <h1 className="mt-2 text-3xl font-semibold">Algorithms</h1>
          </div>
        </div>
        <form className="mb-5 flex gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search algorithms"
            className="w-full rounded-md border bg-white px-3 py-2"
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white">Search</button>
        </form>
        <div className="grid gap-4 md:grid-cols-2">
          {algorithms.map((algorithm) => (
            <Link
              key={algorithm.id}
              href={`/algorithms/${algorithm.slug}`}
              className="rounded-lg border bg-white p-5 hover:border-slate-400"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{algorithm.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                  {algorithm._count.testimonyLinks} testimonies
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{algorithm.description}</p>
              <p className="mt-3 text-sm text-slate-500">{algorithm.useCase} · {algorithm.location}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
