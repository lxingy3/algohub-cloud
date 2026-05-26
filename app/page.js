import Link from 'next/link';
import { prisma } from '../lib/prisma';
import { getJurisdictionId } from '../lib/jurisdiction';
import { getCurrentUser } from '../lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();
  const [algorithmCount, testimonyCount, eventCount] = await Promise.all([
    prisma.algorithm.count({ where: { jurisdictionId } }),
    prisma.testimony.count({ where: { jurisdictionId } }),
    prisma.communityEvent.count({ where: { jurisdictionId } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <nav className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">AlgoHub</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/algorithms" className="rounded-md border bg-white px-3 py-2">Algorithms</Link>
            <Link href="/stories" className="rounded-md border bg-white px-3 py-2">Stories</Link>
            <Link href="/events" className="rounded-md border bg-white px-3 py-2">Events</Link>
            <Link href="/submit-testimony" className="rounded-md border bg-white px-3 py-2">Submit</Link>
            <Link href="/login" className="rounded-md border bg-white px-3 py-2">Login</Link>
            <Link href="/signup" className="rounded-md border bg-white px-3 py-2">Signup</Link>
            <Link href="/admin" className="rounded-md bg-slate-900 px-3 py-2 text-white">Admin</Link>
          </div>
        </nav>

        <section className="rounded-lg border bg-white p-6">
          <p className="text-sm uppercase tracking-wide text-slate-500">Database-backed platform</p>
          <h2 className="mt-2 text-3xl font-semibold">AlgoHub community accountability workspace</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Browse public algorithm records, submit testimonies, join community events, and manage review workflows from one shared PostgreSQL-backed application.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-5">
            <div className="text-3xl font-bold">{algorithmCount}</div>
            <div className="text-sm text-slate-500">Algorithms</div>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <div className="text-3xl font-bold">{testimonyCount}</div>
            <div className="text-sm text-slate-500">Testimonies</div>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <div className="text-3xl font-bold">{eventCount}</div>
            <div className="text-sm text-slate-500">Events</div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border bg-white p-5 text-sm text-slate-600">
          Current user: {user ? `${user.name} (${user.email})` : 'not logged in'}
        </section>
      </div>
    </main>
  );
}
