import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageSquareQuote } from 'lucide-react';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { SiteNav } from '../../components/SiteNav';
import { formatDate, formatStatus } from '../../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function AlgorithmDetailPage({ params }) {
  const { slug } = await params;
  const jurisdictionId = getJurisdictionId();
  const [user, algorithm] = await Promise.all([
    getCurrentUser(),
    prisma.algorithm.findFirst({
      where: { slug, jurisdictionId },
      include: {
        claims: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        testimonyLinks: {
          include: {
            testimony: {
              include: { _count: { select: { comments: true, reactions: true } } },
            },
          },
        },
      },
    }),
  ]);

  if (!algorithm) notFound();

  const approvedLinks = algorithm.testimonyLinks.filter((link) => link.testimony.moderationStatus === 'APPROVED');

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <article className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/algorithms" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-950">
          <ArrowLeft className="h-4 w-4" />
          Back to registry
        </Link>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
                {algorithm.impactLevel ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{formatStatus(algorithm.impactLevel)} Impact</span> : null}
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">{algorithm.name}</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">{algorithm.description}</p>
            </div>
            <Link href={`/submit-testimony?algorithmId=${algorithm.id}`} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Share experience
            </Link>
          </div>

          <dl className="mt-8 grid gap-4 md:grid-cols-4">
            <InfoItem label="Used by" value={algorithm.agencyName || 'Not listed'} />
            <InfoItem label="Use case" value={algorithm.useCase} />
            <InfoItem label="Location" value={algorithm.location} />
            <InfoItem label="Updated" value={formatDate(algorithm.updatedAt)} />
          </dl>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">System details</h2>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoItem label="Purpose" value={algorithm.purpose || 'Not listed'} />
              <InfoItem label="Data used" value={algorithm.dataUsed || 'Not listed'} />
              <InfoItem label="Decision type" value={algorithm.decisionType || 'Not listed'} />
              <InfoItem label="Agency type" value={algorithm.agencyType || 'Not listed'} />
              <InfoItem label="Year introduced" value={algorithm.yearIntroduced || 'Not listed'} />
              <InfoItem label="Year deployed" value={algorithm.yearDeployed || 'Not listed'} />
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Official claims</h2>
            <div className="mt-4 space-y-3">
              {algorithm.claims.map((claim) => (
                <div key={claim.id} className="rounded-md bg-amber-50 p-4">
                  <p className="text-sm leading-6 text-slate-800">{claim.claimText}</p>
                  <p className="mt-2 text-xs text-slate-500">{claim.claimSource || 'Source not listed'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FileText className="h-5 w-5 text-amber-600" />
              Documents
            </h2>
            <div className="mt-4 space-y-3">
              {algorithm.documents.length ? algorithm.documents.map((document) => (
                <a key={document.id} href={document.sourceUrl || '#'} className="block rounded-md border border-slate-200 p-4 text-sm hover:border-amber-300">
                  <span className="font-semibold">{document.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{formatStatus(document.sourceType)}</span>
                </a>
              )) : <p className="text-sm text-slate-500">No documents have been attached yet.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <MessageSquareQuote className="h-5 w-5 text-amber-600" />
              Linked community testimony
            </h2>
            {approvedLinks.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                This algorithm is documented, but there is little public testimony linked to it yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {approvedLinks.map((link) => (
                  <Link key={link.testimonyId} href={`/stories/${link.testimonyId}`} className="block rounded-md border border-slate-200 p-4 hover:border-amber-300">
                    <h3 className="font-semibold">{link.testimony.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{link.testimony.summary}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {link.testimony._count.reactions} reactions / {link.testimony._count.comments} comments
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </article>
    </main>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-900">{value}</dd>
    </div>
  );
}
