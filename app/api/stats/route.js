import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jurisdictionId = getJurisdictionId();
  const [algorithms, testimonies, approvedTestimonies, events, organizations, users] = await Promise.all([
    prisma.algorithm.count({ where: { jurisdictionId } }),
    prisma.testimony.count({ where: { jurisdictionId } }),
    prisma.testimony.count({ where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true } }),
    prisma.communityEvent.count({ where: { jurisdictionId } }),
    prisma.organization.count({ where: { jurisdictionId, isActive: true } }),
    prisma.user.count({ where: { jurisdictionId } }),
  ]);

  return NextResponse.json({ algorithms, testimonies, approvedTestimonies, events, organizations, users });
}
