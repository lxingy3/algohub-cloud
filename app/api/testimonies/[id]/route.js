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
      publicPosting: true,
    },
    select: {
      id: true,
      sourceId: true,
      title: true,
      summary: true,
      city: true,
      imageUrl: true,
      referralSource: true,
      publicPosting: true,
      storyType: true,
      isAnonymous: true,
      narrativeText: true,
      submissionMethod: true,
      originalLanguage: true,
      affectedDomain: true,
      selfReportedImpact: true,
      aiImpactClassification: true,
      aiThemes: true,
      aiConfidenceScore: true,
      aiProcessedAt: true,
      moderationStatus: true,
      submittedAt: true,
      updatedAt: true,
      algorithmLinks: { select: { linkType: true, confidence: true, algorithm: true } },
      brief: true,
      comments: {
        where: { moderationStatus: 'APPROVED', parentCommentId: null },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          replies: {
            where: { moderationStatus: 'APPROVED' },
            select: { id: true, authorName: true, content: true, createdAt: true },
          },
          likes: { select: { id: true } },
        },
      },
      reactions: { select: { id: true, reactionType: true, createdAt: true } },
    },
  });

  if (!testimony) {
    return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
  }

  return NextResponse.json(testimony);
}
