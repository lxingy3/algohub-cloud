import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getCurrentUser } from '../../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { id, commentId } = await params;
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

  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
