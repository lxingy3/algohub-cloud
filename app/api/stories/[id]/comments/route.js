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
  await prisma.comment.create({
    data: {
      jurisdictionId: getJurisdictionId(),
      testimonyId: id,
      userId: user.id,
      authorName: user.name,
      content: String(formData.get('content') || '').trim(),
      parentCommentId: formData.get('parentCommentId') ? String(formData.get('parentCommentId')) : null,
      moderationStatus: 'PENDING',
    },
  });

  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
