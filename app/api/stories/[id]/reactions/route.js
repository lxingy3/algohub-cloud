import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { getCurrentUser } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';
const REACTION_TYPES = new Set(['EYE_OPENING', 'SUPPORT']);

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { id } = await params;
  const formData = await request.formData();
  const reactionType = String(formData.get('reactionType') || 'SUPPORT');
  if (!REACTION_TYPES.has(reactionType)) {
    return NextResponse.json({ error: 'Unsupported reaction type.' }, { status: 400 });
  }

  const jurisdictionId = getJurisdictionId();
  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true },
    select: { id: true },
  });
  if (!testimony) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

  const existing = await prisma.testimonyReaction.findUnique({
    where: {
      testimonyId_userId_reactionType: {
        testimonyId: id,
        userId: user.id,
        reactionType,
      },
    },
  });

  if (existing) {
    await prisma.testimonyReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.testimonyReaction.create({
      data: { jurisdictionId, testimonyId: id, userId: user.id, reactionType },
    });
  }

  return NextResponse.redirect(new URL(`/stories/${id}`, request.url), { status: 303 });
}
