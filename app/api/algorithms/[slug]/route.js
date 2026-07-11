import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { slug } = await params;
  const algorithm = await prisma.algorithm.findFirst({
    where: {
      slug,
      jurisdictionId: getJurisdictionId(),
    },
    include: {
      claims: true,
      documents: true,
      testimonyLinks: {
        where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } },
        include: {
          testimony: {
            select: {
              id: true,
              title: true,
              summary: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  if (!algorithm) {
    return NextResponse.json({ error: 'Algorithm not found' }, { status: 404 });
  }

  return NextResponse.json(algorithm);
}
