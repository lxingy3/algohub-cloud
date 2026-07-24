import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';
import { evaluatePartnerPublicationGate, lockBriefingForUpdate } from '../../../../../lib/briefingPartnerReview';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'save');
  const reviewStatus = action === 'publish' ? 'PUBLISHED' : action === 'review' ? 'REVIEWED' : 'DRAFT';
  const nextContent = {
    title: text(formData, 'title') || 'Untitled briefing',
    executiveSummary: text(formData, 'executiveSummary') || null,
    patternAnalysis: text(formData, 'patternAnalysis') || null,
    keyFindings: lines(formData, 'keyFindings'),
    recommendations: lines(formData, 'recommendations'),
  };
  const requestedOverride = ['1', 'true', 'on'].includes(text(formData, 'partnerReviewOverride').toLowerCase());
  const requestedOverrideReason = text(formData, 'partnerReviewOverrideReason');
  if (requestedOverride && (requestedOverrideReason.length < 10 || requestedOverrideReason.length > 1000)) {
    return NextResponse.json({ error: 'Override reason must be 10 to 1,000 characters.' }, { status: 400 });
  }
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockBriefingForUpdate(tx, id);
    if (!locked) return { status: 404, body: { error: 'Briefing not found' } };
    const briefing = await tx.briefing.findFirst({
      where: { id, jurisdictionId: getJurisdictionId() },
      select: {
        id: true,
        title: true,
        executiveSummary: true,
        patternAnalysis: true,
        keyFindings: true,
        recommendations: true,
        partnerReviewOverrideReason: true,
        partnerReviewOverriddenAt: true,
        partnerReviews: {
          select: {
            id: true,
            status: true,
            organization: { select: { id: true, name: true, isActive: true } },
          },
        },
      },
    });
    if (!briefing) return { status: 404, body: { error: 'Briefing not found' } };

    const contentChanged = hasContentChanged(briefing, nextContent);
    const storedOverride = !contentChanged && Boolean(briefing.partnerReviewOverriddenAt && briefing.partnerReviewOverrideReason);
    const assignmentsForGate = contentChanged
      ? briefing.partnerReviews.map((row) => ({ ...row, status: 'PENDING' }))
      : briefing.partnerReviews;
    const gate = evaluatePartnerPublicationGate(assignmentsForGate, {
      enabled: requestedOverride || storedOverride,
      reason: requestedOverride ? requestedOverrideReason : briefing.partnerReviewOverrideReason,
    });
    if (reviewStatus === 'PUBLISHED' && !gate.allowed) {
      return {
        status: 409,
        body: {
          error: contentChanged
            ? 'Save the revised briefing and obtain fresh partner approvals, or publish with an explicit override reason.'
            : !gate.assignmentCount
              ? 'Assign at least one partner organization before publishing, or publish with an explicit override reason.'
              : 'Every assigned partner must approve before publishing, or an admin must provide an explicit override reason.',
          partnerReview: {
            assignmentCount: gate.assignmentCount,
            pending: gate.pending.map((row) => ({ organization: row.organization, status: row.status })),
          },
        },
      };
    }

    const overrideData = contentChanged || (reviewStatus === 'PUBLISHED' && gate.allApproved)
      ? emptyOverride()
      : {};
    if (reviewStatus === 'PUBLISHED' && gate.overridden && requestedOverride) {
      Object.assign(overrideData, {
        partnerReviewOverrideReason: gate.overrideReason,
        partnerReviewOverriddenByUserId: admin.id,
        partnerReviewOverriddenAt: new Date(),
      });
    }
    await tx.briefing.update({
      where: { id },
      data: {
        ...nextContent,
        ...overrideData,
        reviewStatus,
        reviewedByUserId: admin.id,
        reviewedAt: new Date(),
        publishedAt: reviewStatus === 'PUBLISHED' ? new Date() : null,
      },
    });
    if (contentChanged) {
      await tx.briefingPartnerReview.updateMany({
        where: { briefingId: id },
        data: { status: 'PENDING', reviewedByUserId: null, reviewedAt: null },
      });
    }
    return { status: 200, gate };
  }, { maxWait: 10_000, timeout: 30_000 });
  if (result.status !== 200) return NextResponse.json(result.body, { status: result.status });
  const gate = result.gate;

  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({
      reviewStatus,
      message: reviewStatus === 'PUBLISHED' ? 'Published and ready on the public page.' : reviewStatus === 'REVIEWED' ? 'Review recorded. The briefing remains private.' : 'Draft saved. The briefing remains private.',
      publicPage: reviewStatus === 'PUBLISHED' ? 'Updated now' : 'Not published',
      mlRefresh: 'Not run. The saved charts and corpus results were left unchanged.',
      partnerReview: {
        assignmentCount: gate.assignmentCount,
        allApproved: gate.allApproved,
        overridden: reviewStatus === 'PUBLISHED' && gate.overridden,
      },
    });
  }
  return NextResponse.redirect(new URL('/admin/briefings', request.url), { status: 303 });
}

function text(formData, key) {
  return String(formData.get(key) || '').trim();
}

function lines(formData, key) {
  return text(formData, key).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function hasContentChanged(current, next) {
  return current.title !== next.title
    || current.executiveSummary !== next.executiveSummary
    || current.patternAnalysis !== next.patternAnalysis
    || JSON.stringify(current.keyFindings || []) !== JSON.stringify(next.keyFindings)
    || JSON.stringify(current.recommendations || []) !== JSON.stringify(next.recommendations);
}

function emptyOverride() {
  return {
    partnerReviewOverrideReason: null,
    partnerReviewOverriddenByUserId: null,
    partnerReviewOverriddenAt: null,
  };
}
