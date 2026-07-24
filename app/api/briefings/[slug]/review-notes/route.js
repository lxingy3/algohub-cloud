import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { prisma } from '../../../../../lib/prisma';
import { canAccessPartnerReview, canChangePartnerDecision, lockBriefingForUpdate, normalizePartnerReviewStatus } from '../../../../../lib/briefingPartnerReview';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Partner reviewer access required.' }, { status: 403 });
  const roles = new Set(user.userRoles.map(({ role }) => role.name));
  if (roles.has('ADMIN')) {
    return NextResponse.json({ error: 'Partner decisions must be submitted by a reviewer in the assigned organization.' }, { status: 403 });
  }
  if (!user.organizationId || (!roles.has('FACILITATOR') && !roles.has('ORG_MEMBER'))) {
    return NextResponse.json({ error: 'Partner reviewer access required.' }, { status: 403 });
  }
  const { slug } = await params;
  const jurisdictionId = getJurisdictionId();
  const formData = await request.formData();
  const status = normalizePartnerReviewStatus(formData.get('status'));
  if (!status) return NextResponse.json({ error: 'Select approve, concern, or request revision.' }, { status: 400 });
  const content = String(formData.get('content') || '').trim();
  if (content.length < 10 || content.length > 4000) return NextResponse.json({ error: 'Review notes must be 10 to 4,000 characters.' }, { status: 400 });
  const candidate = await prisma.briefing.findFirst({
    where: { jurisdictionId, slug },
    select: { id: true },
  });
  if (!candidate) return NextResponse.json({ error: 'Briefing not found.' }, { status: 404 });
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockBriefingForUpdate(tx, candidate.id);
    if (!locked) return { status: 404, error: 'Briefing not found.' };
    const briefing = await tx.briefing.findFirst({
      where: { id: candidate.id, jurisdictionId, slug },
      select: {
        id: true,
        reviewStatus: true,
        partnerReviews: {
          where: { organizationId: user.organizationId, organization: { isActive: true } },
          select: { id: true, organizationId: true },
        },
      },
    });
    if (!briefing) return { status: 404, error: 'Briefing not found.' };
    const assignment = briefing.partnerReviews[0];
    if (!assignment || !canAccessPartnerReview(user, assignment.organizationId)) {
      return { status: 403, error: 'This briefing is not assigned to your organization.' };
    }
    if (!canChangePartnerDecision(briefing.reviewStatus)) {
      return { status: 409, error: 'Published briefings are read-only. Move it back to review before changing a partner decision.' };
    }
    await tx.briefingPartnerReview.update({
      where: { id: assignment.id },
      data: { status, reviewedByUserId: user.id, reviewedAt: new Date() },
    });
    await tx.briefingReviewNote.create({
      data: {
        jurisdictionId,
        briefingId: briefing.id,
        userId: user.id,
        organizationId: assignment.organizationId,
        partnerReviewStatus: status,
        content,
      },
    });
    await tx.briefing.update({
      where: { id: briefing.id },
      data: {
        partnerReviewOverrideReason: null,
        partnerReviewOverriddenByUserId: null,
        partnerReviewOverriddenAt: null,
      },
    });
    return { status: 200 };
  }, { maxWait: 10_000, timeout: 30_000 });
  if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.redirect(new URL(`/briefings/review/${slug}?saved=1&status=${status}`, request.url), { status: 303 });
}
