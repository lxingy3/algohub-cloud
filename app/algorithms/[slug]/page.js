import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export default async function AlgorithmDetailPage({ params }) {
  const { slug } = await params;
  const algorithm = await prisma.algorithm.findFirst({
    where: { slug, jurisdictionId: getJurisdictionId() },
    include: {
      claims: true,
      documents: true,
      testimonyLinks: { include: { testimony: true } },
    },
  });

  if (!algorithm) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <article className="mx-auto max-w-4xl rounded-lg border bg-white p-6">
        <Link href="/algorithms" className="text-sm text-blue-700">Back to algorithms</Link>
        <h1 className="mt-3 text-3xl font-semibold">{algorithm.name}</h1>
        <p className="mt-3 text-slate-600">{algorithm.description}</p>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Used by</dt><dd>{algorithm.agencyName || 'N/A'}</dd></div>
          <div><dt className="text-sm text-slate-500">Use case</dt><dd>{algorithm.useCase}</dd></div>
          <div><dt className="text-sm text-slate-500">Location</dt><dd>{algorithm.location}</dd></div>
          <div><dt className="text-sm text-slate-500">Status</dt><dd>{algorithm.status}</dd></div>
        </dl>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Official claims</h2>
          <ul className="mt-3 space-y-2">
            {algorithm.claims.map((claim) => (
              <li key={claim.id} className="rounded-md bg-slate-50 p-3 text-sm">{claim.claimText}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Documents</h2>
          <ul className="mt-3 space-y-2">
            {algorithm.documents.map((document) => (
              <li key={document.id} className="rounded-md bg-slate-50 p-3 text-sm">
                {document.title}
                {document.sourceUrl ? <span className="text-slate-500"> · {document.sourceUrl}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Linked testimonies</h2>
          <ul className="mt-3 space-y-2">
            {algorithm.testimonyLinks.map((link) => (
              <li key={link.testimonyId} className="rounded-md bg-slate-50 p-3 text-sm">
                {link.testimony.title || link.testimony.summary}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
