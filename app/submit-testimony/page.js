import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';
import { getCurrentUser } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function SubmitTestimonyPage() {
  const user = await getCurrentUser();
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-lg border bg-white p-6">
        <Link href="/" className="text-sm text-blue-700">Back home</Link>
        <h1 className="mt-3 text-2xl font-semibold">Submit testimony</h1>
        <p className="mt-2 text-sm text-slate-600">
          {user ? `Submitting as ${user.email}` : 'You can submit without login, but login links it to your account.'}
        </p>
        <form action="/api/testimonies" method="post" className="mt-5 space-y-4">
          <input name="title" placeholder="Short title" className="w-full rounded-md border px-3 py-2" required />
          <input name="city" placeholder="City" className="w-full rounded-md border px-3 py-2" />
          <select name="algorithmId" className="w-full rounded-md border px-3 py-2">
            <option value="">Related algorithm (optional)</option>
            {algorithms.map((algorithm) => (
              <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>
            ))}
          </select>
          <textarea name="narrativeText" placeholder="Share the story" className="min-h-40 w-full rounded-md border px-3 py-2" required />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white">Submit</button>
        </form>
      </div>
    </main>
  );
}
