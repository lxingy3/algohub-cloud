import { NextResponse } from 'next/server';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jurisdictionId = getJurisdictionId();
  const items = await prisma.briefing.findMany({
    where: { jurisdictionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      briefingType: true,
      targetTheme: true,
      testimonyCount: true,
      reviewStatus: true,
      publishedAt: true,
      generatedBy: true,
    },
  });
  return NextResponse.json({ items, total: items.length });
}

