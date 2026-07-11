import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { getCurrentUser } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { id } = await params;
  const formData = await request.formData();
  const jurisdictionId = getJurisdictionId();
  const content = String(formData.get('content') || '').trim();
  const parentCommentId = formData.get('parentCommentId') ? String(formData.get('parentCommentId')) : null;
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: 'Comment must be between 1 and 2,000 characters.' }, { status: 400 });
  }

  const [testimony, parentComment] = await Promise.all([
    prisma.testimony.findFirst({
      where: { id, jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true },
      select: { id: true },
    }),
    parentCommentId ? prisma.comment.findFirst({
      where: { id: parentCommentId, testimonyId: id, jurisdictionId, moderationStatus: 'APPROVED' },
      select: { id: true },
    }) : null,
  ]);
  if (!testimony) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  if (parentCommentId && !parentComment) return NextResponse.json({ error: 'Parent comment not found.' }, { status: 404 });

  await prisma.comment.create({
    data: {
      jurisdictionId,
      testimonyId: id,
      userId: user.id,
      authorName: user.name,
      content,
      parentCommentId,
      moderationStatus: 'PENDING',
    },
  });

  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
