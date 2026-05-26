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
  const reactionType = String(formData.get('reactionType') || 'SUPPORT');

  await prisma.testimonyReaction.upsert({
    where: {
      testimonyId_userId_reactionType: {
        testimonyId: id,
        userId: user.id,
        reactionType,
      },
    },
    update: {},
    create: {
      jurisdictionId: getJurisdictionId(),
      testimonyId: id,
      userId: user.id,
      reactionType,
    },
  });

  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
