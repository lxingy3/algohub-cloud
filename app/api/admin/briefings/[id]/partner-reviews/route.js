import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth';
import { lockBriefingForUpdate, parsePartnerDeadline } from '../../../../../../lib/briefingPartnerReview';
import { getJurisdictionId } from '../../../../../../lib/jurisdiction';
import { prisma } from '../../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const briefing = await findBriefing((await params).id);
  if (!briefing) return NextResponse.json({ error: 'Briefing not found.' }, { status: 404 });
  return NextResponse.json(serializeBriefingGate(briefing));
}

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'assign').trim().toLowerCase();
  const organizationId = String(formData.get('organizationId') || '').trim();

  if (action === 'override') {
    const reason = String(formData.get('reason') || '').trim();
    if (reason.length < 10 || reason.length > 1000) {
      return NextResponse.json({ error: 'Override reason must be 10 to 1,000 characters.' }, { status: 400 });
    }
    const result = await mutateEditableBriefing(id, async (tx) => {
      await tx.briefing.update({
        where: { id },
        data: {
          partnerReviewOverrideReason: reason,
          partnerReviewOverriddenByUserId: admin.id,
          partnerReviewOverriddenAt: new Date(),
        },
      });
      return { action, override: { reason, byUserId: admin.id } };
    });
    return mutationResponse(result);
  }

  if (action === 'clear_override') {
    const result = await mutateEditableBriefing(id, async (tx) => {
      await tx.briefing.update({ where: { id }, data: emptyOverride() });
      return { action, override: null };
    });
    return mutationResponse(result);
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required.' }, { status: 400 });
  }

  if (action === 'remove') {
    const result = await mutateEditableBriefing(id, async (tx) => {
      const result = await tx.briefingPartnerReview.deleteMany({ where: { briefingId: id, organizationId } });
      await tx.briefing.update({ where: { id }, data: emptyOverride() });
      return result.count
        ? { action, organizationId }
        : { error: 'Partner assignment not found.', status: 404 };
    });
    return mutationResponse(result);
  }

  if (action !== 'assign') {
    return NextResponse.json({ error: 'action must be assign, remove, override, or clear_override.' }, { status: 400 });
  }

  const deadline = parsePartnerDeadline(formData.get('deadline'));
  if (!deadline) return NextResponse.json({ error: 'A valid deadline is required.' }, { status: 400 });
  const reset = String(formData.get('reset') || '') === '1';
  const result = await mutateEditableBriefing(id, async (tx) => {
    const organization = await tx.organization.findFirst({
      where: { id: organizationId, jurisdictionId: getJurisdictionId(), isActive: true },
      select: { id: true },
    });
    if (!organization) return { error: 'Active organization not found.', status: 404 };
    const row = await tx.briefingPartnerReview.upsert({
      where: { briefingId_organizationId: { briefingId: id, organizationId } },
      create: {
        jurisdictionId: getJurisdictionId(),
        briefingId: id,
        organizationId,
        assignedByUserId: admin.id,
        deadline,
      },
      update: {
        deadline,
        assignedByUserId: admin.id,
        assignedAt: new Date(),
        ...(reset ? { status: 'PENDING', reviewedByUserId: null, reviewedAt: null } : {}),
      },
      include: assignmentInclude,
    });
    await tx.briefing.update({ where: { id }, data: emptyOverride() });
    return { action, assignment: serializeAssignment(row) };
  });
  return mutationResponse(result);
}

async function mutateEditableBriefing(id, mutate) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockBriefingForUpdate(tx, id);
    if (!locked) return { error: 'Briefing not found.', status: 404 };
    const briefing = await tx.briefing.findFirst({
      where: { id, jurisdictionId: getJurisdictionId() },
      select: { reviewStatus: true },
    });
    if (!briefing) return { error: 'Briefing not found.', status: 404 };
    if (briefing.reviewStatus === 'PUBLISHED') {
      return { error: 'Move the briefing out of PUBLISHED before changing its partner gate.', status: 409 };
    }
    return mutate(tx, briefing);
  }, { maxWait: 10_000, timeout: 30_000 });
}

function mutationResponse(result) {
  return result.error
    ? NextResponse.json({ error: result.error }, { status: result.status })
    : NextResponse.json(result);
}

async function findBriefing(id) {
  return prisma.briefing.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: {
      id: true,
      slug: true,
      title: true,
      reviewStatus: true,
      partnerReviewOverrideReason: true,
      partnerReviewOverriddenAt: true,
      partnerReviewOverriddenBy: { select: { id: true, name: true, email: true } },
      partnerReviews: { orderBy: { deadline: 'asc' }, include: assignmentInclude },
    },
  });
}

function emptyOverride() {
  return {
    partnerReviewOverrideReason: null,
    partnerReviewOverriddenByUserId: null,
    partnerReviewOverriddenAt: null,
  };
}

const assignmentInclude = {
  organization: { select: { id: true, name: true, slug: true, isActive: true } },
  assignedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

function serializeBriefingGate(briefing) {
  return {
    briefing: {
      id: briefing.id,
      slug: briefing.slug,
      title: briefing.title,
      reviewStatus: briefing.reviewStatus,
    },
    assignments: briefing.partnerReviews.map(serializeAssignment),
    override: briefing.partnerReviewOverriddenAt ? {
      reason: briefing.partnerReviewOverrideReason,
      at: briefing.partnerReviewOverriddenAt,
      by: briefing.partnerReviewOverriddenBy,
    } : null,
  };
}

function serializeAssignment(assignment) {
  return {
    id: assignment.id,
    organization: assignment.organization,
    status: assignment.status,
    deadline: assignment.deadline,
    assignedAt: assignment.assignedAt,
    assignedBy: assignment.assignedBy,
    reviewedAt: assignment.reviewedAt,
    reviewedBy: assignment.reviewedBy,
  };
}
