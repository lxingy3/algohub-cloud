import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const jurisdictionId = getJurisdictionId();
  const [pendingTestimonies, pendingComments, users, algorithms, events] = await Promise.all([
    prisma.testimony.count({ where: { jurisdictionId, moderationStatus: 'PENDING' } }),
    prisma.comment.count({ where: { jurisdictionId, moderationStatus: 'PENDING' } }),
    prisma.user.count({ where: { jurisdictionId } }),
    prisma.algorithm.count({ where: { jurisdictionId } }),
    prisma.communityEvent.count({ where: { jurisdictionId } }),
  ]);

  return NextResponse.json({ pendingTestimonies, pendingComments, users, algorithms, events });
}
