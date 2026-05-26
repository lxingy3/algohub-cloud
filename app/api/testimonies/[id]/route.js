import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { id } = await params;
  const testimony = await prisma.testimony.findFirst({
    where: {
      id,
      jurisdictionId: getJurisdictionId(),
      moderationStatus: 'APPROVED',
    },
    include: {
      algorithmLinks: { include: { algorithm: true } },
      brief: true,
      comments: {
        where: { moderationStatus: 'APPROVED', parentCommentId: null },
        include: {
          user: { select: { id: true, name: true } },
          replies: { where: { moderationStatus: 'APPROVED' } },
          likes: true,
        },
      },
      reactions: true,
    },
  });

  if (!testimony) {
    return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
  }

  return NextResponse.json(testimony);
}
