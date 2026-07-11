import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);

  const algorithm = await prisma.algorithm.findFirst({
    where: { slug, jurisdictionId: getJurisdictionId() },
    select: { id: true },
  });

  if (!algorithm) {
    return NextResponse.json({ error: 'Algorithm not found' }, { status: 404 });
  }

  const where = {
    algorithmId: algorithm.id,
    testimony: { moderationStatus: 'APPROVED', publicPosting: true, jurisdictionId: getJurisdictionId() },
  };

  const [items, total] = await Promise.all([
    prisma.testimonyAlgorithmLink.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        testimony: {
          select: {
            id: true,
            title: true,
            summary: true,
            narrativeText: true,
            city: true,
            affectedDomain: true,
            selfReportedImpact: true,
            aiImpactClassification: true,
            originalLanguage: true,
            submittedAt: true,
          },
        },
      },
    }),
    prisma.testimonyAlgorithmLink.count({ where }),
  ]);

  return NextResponse.json({ items: items.map((item) => item.testimony), page, limit, total });
}
