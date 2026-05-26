import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { getJurisdictionId } from '../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function StoriesPage() {
  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      moderationStatus: 'APPROVED',
    },
    orderBy: { submittedAt: 'desc' },
    include: {
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-blue-700">Back home</Link>
        <h1 className="mt-2 text-3xl font-semibold">Stories</h1>
        <div className="mt-6 space-y-3">
          {testimonies.map((testimony) => (
            <Link key={testimony.id} href={`/stories/${testimony.id}`} className="block rounded-lg border bg-white p-5">
              <h2 className="font-semibold">{testimony.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{testimony.summary}</p>
              <p className="mt-3 text-xs text-slate-500">
                {testimony._count.reactions} reactions - {testimony._count.comments} comments
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
