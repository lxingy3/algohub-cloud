import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { prisma } from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function canReview(user) {
  return user?.userRoles.some(({ role }) => ['ADMIN', 'FACILITATOR', 'ORG_MEMBER'].includes(role.name));
}

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!canReview(user)) return NextResponse.json({ error: 'Partner reviewer access required.' }, { status: 403 });
  const { slug } = await params;
  const jurisdictionId = getJurisdictionId();
  const briefing = await prisma.briefing.findFirst({ where: { jurisdictionId, slug }, select: { id: true } });
  if (!briefing) return NextResponse.json({ error: 'Briefing not found.' }, { status: 404 });
  const formData = await request.formData();
  const content = String(formData.get('content') || '').trim();
  if (content.length < 10 || content.length > 4000) return NextResponse.json({ error: 'Review notes must be 10 to 4,000 characters.' }, { status: 400 });
  await prisma.briefingReviewNote.create({
    data: { jurisdictionId, briefingId: briefing.id, userId: user.id, organizationId: user.organizationId, content },
  });
  return NextResponse.redirect(new URL(`/briefings/review/${slug}?saved=1`, request.url), { status: 303 });
}
