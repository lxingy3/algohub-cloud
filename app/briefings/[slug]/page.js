import { notFound, redirect } from 'next/navigation';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function BriefingEntryPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const briefing = await prisma.briefing.findFirst({
    where: { jurisdictionId: getJurisdictionId(), slug, reviewStatus: 'PUBLISHED' },
    select: { briefingType: true, targetAlgorithm: { select: { slug: true } } },
  });
  if (!briefing) notFound();
  const next = new URLSearchParams();
  next.set('lens', ['community', 'intermediary', 'government'].includes(query?.lens) ? query.lens : 'community');
  next.set('scope', briefing.targetAlgorithm ? 'algorithm' : 'overview');
  if (briefing.targetAlgorithm) next.set('algorithm', briefing.targetAlgorithm.slug);
  next.set('language', query?.language || 'en');
  next.set('reading', query?.reading || 'standard');
  redirect(`/briefings?${next.toString()}`);
}
