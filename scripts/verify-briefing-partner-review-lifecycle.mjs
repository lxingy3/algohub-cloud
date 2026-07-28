import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { getJurisdictionId } from '../lib/jurisdiction.js';
import { requireTestDatabase } from './lib/require-test-database.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
await requireTestDatabase('verify-briefing-partner-review-lifecycle', baseUrl);
const { prisma } = await import('../lib/prisma.js');
const jurisdictionId = getJurisdictionId();
const suffix = randomUUID();
const createdUserIds = [];
let organization;
let briefing;

async function userWithSession(roleName, organizationId = null) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName, description: `${roleName} role.` },
  });
  const user = await prisma.user.create({
    data: {
      jurisdictionId,
      email: `partner-gate-${roleName.toLowerCase()}-${randomUUID()}@example.invalid`,
      name: `Partner Gate ${roleName}`,
      primaryRoleName: roleName,
      organizationId,
      userRoles: { create: { roleId: role.id } },
    },
  });
  createdUserIds.push(user.id);
  const token = randomUUID();
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return { user, cookie: `algohub_session=${token}` };
}

async function post(path, body, cookie, accept = 'application/json') {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      cookie,
      accept,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
    redirect: 'manual',
  });
}

function briefingBody(action, row, extra = {}) {
  return {
    action,
    title: row.title,
    executiveSummary: row.executiveSummary || '',
    patternAnalysis: row.patternAnalysis || '',
    keyFindings: (row.keyFindings || []).join('\n'),
    recommendations: (row.recommendations || []).join('\n'),
    ...extra,
  };
}

async function main() {
  organization = await prisma.organization.create({
    data: {
      jurisdictionId,
      name: `Partner Gate Organization ${suffix}`,
      slug: `partner-gate-${suffix}`,
      role: 'community_partner',
      isActive: true,
    },
  });
  const otherOrganization = await prisma.organization.create({
    data: {
      jurisdictionId,
      name: `Unassigned Partner Gate Organization ${suffix}`,
      slug: `partner-gate-unassigned-${suffix}`,
      role: 'community_partner',
      isActive: true,
    },
  });
  const admin = await userWithSession('ADMIN');
  const partner = await userWithSession('ORG_MEMBER', organization.id);
  const unassignedPartner = await userWithSession('ORG_MEMBER', otherOrganization.id);

  briefing = await prisma.briefing.create({
    data: {
      jurisdictionId,
      title: `Partner gate lifecycle ${suffix}`,
      slug: `partner-gate-lifecycle-${suffix}`,
      briefingType: 'CROSS_CUTTING',
      testimonyCount: 12,
      executiveSummary: 'A synthetic Briefing created only to verify the full partner review gate.',
      patternAnalysis: 'Synthetic partner review lifecycle regression.',
      keyFindings: ['Synthetic finding one', 'Synthetic finding two', 'Synthetic finding three'],
      recommendations: ['Run the review gate regression before release.'],
      generatedBy: 'partner_gate_regression',
      reviewStatus: 'DRAFT',
    },
  });

  const adminPath = `/api/admin/briefings/${briefing.id}`;
  const gatePath = `${adminPath}/partner-reviews`;
  const blockedWithoutAssignment = await post(
    adminPath,
    briefingBody('publish', briefing),
    admin.cookie,
  );
  assert.equal(blockedWithoutAssignment.status, 409);

  const deadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const assigned = await post(
    gatePath,
    { action: 'assign', organizationId: organization.id, deadline },
    admin.cookie,
  );
  assert.equal(assigned.status, 200);
  const overdueAssignment = await prisma.briefingPartnerReview.findUnique({
    where: { briefingId_organizationId: { briefingId: briefing.id, organizationId: organization.id } },
    select: { deadline: true, status: true },
  });
  assert.ok(overdueAssignment.deadline.getTime() < Date.now());
  assert.equal(overdueAssignment.status, 'PENDING');
  const overduePending = await post(adminPath, briefingBody('publish', briefing), admin.cookie);
  assert.equal(overduePending.status, 409);
  assert.equal((await overduePending.json()).partnerReview.pending[0].status, 'PENDING');

  const partnerPath = `/api/briefings/${briefing.slug}/review-notes`;
  const unauthorized = await post(
    partnerPath,
    { status: 'APPROVED', content: 'This organization was not assigned to review the Briefing.' },
    unassignedPartner.cookie,
  );
  assert.equal(unauthorized.status, 403);
  const adminImpersonation = await post(
    partnerPath,
    { status: 'APPROVED', content: 'An admin must not impersonate a partner reviewer.' },
    admin.cookie,
  );
  assert.equal(adminImpersonation.status, 403);

  const concern = await post(
    partnerPath,
    { status: 'CONCERN', content: 'Please clarify how the evidence count was assembled.' },
    partner.cookie,
    'text/html',
  );
  assert.equal(concern.status, 303);
  assert.equal(
    (await prisma.briefingPartnerReview.findUnique({
      where: { briefingId_organizationId: { briefingId: briefing.id, organizationId: organization.id } },
    })).status,
    'CONCERN',
  );
  assert.equal((await post(adminPath, briefingBody('publish', briefing), admin.cookie)).status, 409);

  const revisionRequested = await post(
    partnerPath,
    { status: 'REVISION_REQUESTED', content: 'Please revise the evidence window before this Briefing is published.' },
    partner.cookie,
    'text/html',
  );
  assert.equal(revisionRequested.status, 303);
  assert.equal(
    (await prisma.briefingPartnerReview.findUnique({
      where: { briefingId_organizationId: { briefingId: briefing.id, organizationId: organization.id } },
    })).status,
    'REVISION_REQUESTED',
  );
  assert.equal(
    await prisma.briefingReviewNote.count({
      where: {
        briefingId: briefing.id,
        organizationId: organization.id,
        partnerReviewStatus: 'REVISION_REQUESTED',
      },
    }),
    1,
  );
  assert.equal((await post(adminPath, briefingBody('publish', briefing), admin.cookie)).status, 409);

  const approved = await post(
    partnerPath,
    { status: 'APPROVED', content: 'The organization approves this synthetic Briefing for publication.' },
    partner.cookie,
    'text/html',
  );
  assert.equal(approved.status, 303);

  const secondDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal((await post(
    gatePath,
    { action: 'assign', organizationId: otherOrganization.id, deadline: secondDeadline },
    admin.cookie,
  )).status, 200);
  const blockedBySecondOrganization = await post(
    adminPath,
    briefingBody('publish', briefing),
    admin.cookie,
  );
  assert.equal(blockedBySecondOrganization.status, 409);
  const blockedGate = (await blockedBySecondOrganization.json()).partnerReview;
  assert.equal(blockedGate.assignmentCount, 2);
  assert.ok(blockedGate.pending.some((row) => (
    row.organization.id === otherOrganization.id && row.status === 'PENDING'
  )));
  assert.equal((await post(
    partnerPath,
    { status: 'APPROVED', content: 'The second assigned organization also approves this synthetic Briefing.' },
    unassignedPartner.cookie,
    'text/html',
  )).status, 303);
  assert.equal(
    await prisma.briefingPartnerReview.count({
      where: { briefingId: briefing.id, status: 'APPROVED' },
    }),
    2,
  );

  const [racedDecision, racedPublication] = await Promise.all([
    post(
      partnerPath,
      { status: 'CONCERN', content: 'Concurrent concern used to verify the publication row lock.' },
      partner.cookie,
      'text/html',
    ),
    post(adminPath, briefingBody('publish', briefing), admin.cookie),
  ]);
  assert.ok(
    (racedDecision.status === 303 && racedPublication.status === 409)
    || (racedDecision.status === 409 && racedPublication.status === 200),
  );
  let raceState = await prisma.briefing.findUnique({
    where: { id: briefing.id },
    select: {
      reviewStatus: true,
      partnerReviews: {
        where: { organizationId: organization.id },
        select: { status: true },
      },
    },
  });
  assert.ok(!(raceState.reviewStatus === 'PUBLISHED' && raceState.partnerReviews[0].status !== 'APPROVED'));
  if (raceState.reviewStatus !== 'PUBLISHED') {
    assert.equal((await post(
      partnerPath,
      { status: 'APPROVED', content: 'The organization re-approves after the concurrent lock regression.' },
      partner.cookie,
      'text/html',
    )).status, 303);
    assert.equal((await post(adminPath, briefingBody('publish', briefing), admin.cookie)).status, 200);
    raceState = await prisma.briefing.findUnique({
      where: { id: briefing.id },
      select: { reviewStatus: true },
    });
  }
  assert.equal(raceState.reviewStatus, 'PUBLISHED');

  const afterPublication = await post(
    partnerPath,
    { status: 'CONCERN', content: 'Published partner decisions are locked.' },
    partner.cookie,
  );
  assert.equal(afterPublication.status, 409);

  await prisma.briefing.update({ where: { id: briefing.id }, data: { reviewStatus: 'REVIEWED', publishedAt: null } });
  const recordedOverrideReason = 'Synthetic editable override used to verify explicit clearing.';
  assert.equal((await post(
    gatePath,
    { action: 'override', reason: recordedOverrideReason },
    admin.cookie,
  )).status, 200);
  const recordedOverride = await prisma.briefing.findUnique({
    where: { id: briefing.id },
    select: {
      partnerReviewOverrideReason: true,
      partnerReviewOverriddenByUserId: true,
      partnerReviewOverriddenAt: true,
    },
  });
  assert.equal(recordedOverride.partnerReviewOverrideReason, recordedOverrideReason);
  assert.equal(recordedOverride.partnerReviewOverriddenByUserId, admin.user.id);
  assert.ok(recordedOverride.partnerReviewOverriddenAt);
  assert.equal((await post(gatePath, { action: 'clear_override' }, admin.cookie)).status, 200);
  assert.deepEqual(
    await prisma.briefing.findUnique({
      where: { id: briefing.id },
      select: {
        partnerReviewOverrideReason: true,
        partnerReviewOverriddenByUserId: true,
        partnerReviewOverriddenAt: true,
      },
    }),
    {
      partnerReviewOverrideReason: null,
      partnerReviewOverriddenByUserId: null,
      partnerReviewOverriddenAt: null,
    },
  );

  assert.equal((await post(
    gatePath,
    { action: 'remove', organizationId: otherOrganization.id },
    admin.cookie,
  )).status, 200);
  assert.equal(
    await prisma.briefingPartnerReview.findUnique({
      where: {
        briefingId_organizationId: {
          briefingId: briefing.id,
          organizationId: otherOrganization.id,
        },
      },
    }),
    null,
  );

  const revised = {
    ...briefing,
    executiveSummary: `${briefing.executiveSummary} Revised after partner feedback.`,
  };
  assert.equal((await post(adminPath, briefingBody('review', revised), admin.cookie)).status, 200);
  assert.equal(
    (await prisma.briefingPartnerReview.findUnique({
      where: { briefingId_organizationId: { briefingId: briefing.id, organizationId: organization.id } },
    })).status,
    'PENDING',
  );
  assert.equal((await post(adminPath, briefingBody('publish', revised), admin.cookie)).status, 409);

  const overridden = await post(
    adminPath,
    briefingBody('publish', revised, {
      partnerReviewOverride: '1',
      partnerReviewOverrideReason: 'Synthetic emergency override used only by the lifecycle regression.',
    }),
    admin.cookie,
  );
  assert.equal(overridden.status, 200);
  const finalBriefing = await prisma.briefing.findUnique({ where: { id: briefing.id } });
  assert.equal(finalBriefing.reviewStatus, 'PUBLISHED');
  assert.match(finalBriefing.partnerReviewOverrideReason, /Synthetic emergency override/);

  console.log(JSON.stringify({
    status: 'PASS',
    assignment: 'admin assigned and removed organizations through the gate API',
    authorization: 'unassigned organization denied; admin impersonation denied',
    decisions: 'concern and revision request blocked publication; approval allowed publication',
    deadline: 'an overdue pending review remained blocked by status; its later approval remained eligible',
    multiOrganization: 'publication required every assigned organization to approve',
    concurrency: 'publication and partner decision serialized; no published concern state',
    revision: 'content change reset approval to pending',
    publishedLock: 'partner decision change after publication denied',
    override: 'admin override was recorded, cleared, and later required an auditable publication reason',
  }, null, 2));
}

async function cleanup() {
  if (briefing) await prisma.briefing.deleteMany({ where: { id: briefing.id } });
  if (createdUserIds.length) {
    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.organization.deleteMany({
    where: { slug: { in: [`partner-gate-${suffix}`, `partner-gate-unassigned-${suffix}`] } },
  });
}

try {
  await main();
} finally {
  await cleanup();
  await prisma.$disconnect();
}
