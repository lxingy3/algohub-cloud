import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getCurrentUser } from '../../../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { id, commentId } = await params;
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      testimonyId: id,
      jurisdictionId: getJurisdictionId(),
      moderationStatus: 'APPROVED',
      testimony: { moderationStatus: 'APPROVED', publicPosting: true },
    },
    select: { id: true },
  });
  if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });

  const existing = await prisma.commentLike.findUnique({
    where: {
      commentId_userId: {
        commentId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentLike.create({
      data: {
        commentId,
        userId: user.id,
      },
    });
  }

  if (request.headers.get('x-story-mutation') === 'true') {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
