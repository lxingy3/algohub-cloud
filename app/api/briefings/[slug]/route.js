import { NextResponse } from 'next/server';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const jurisdictionId = getJurisdictionId();
  const briefing = await prisma.briefing.findFirst({
    where: { jurisdictionId, slug: params.slug },
    include: {
      targetAlgorithm: { select: { slug: true, name: true, useCase: true, agencyName: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });
  if (!briefing) return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });
  return NextResponse.json(briefing);
}

