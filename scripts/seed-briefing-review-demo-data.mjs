import assert from 'node:assert/strict';
import fs from 'node:fs';

import { PrismaClient } from '@prisma/client';
import { emptyPartnerReviewOverride, lockBriefingForUpdate } from '../lib/briefingPartnerReview.js';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local', '.env']) loadEnvFile(file);

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const partnerSlug = 'demo-v2-pittsburgh-resident-resource-network';
const partnerEmail = 'demo-v2-partner-reviewer@example.test';
const adminEmail = process.env.BRIEFINGS_REVIEWER_EMAIL || 'admin@algostories.local';
const now = new Date();

const reviewFixtures = [
  ['approved', 'APPROVED', 7],
  ['pending-overdue', 'PENDING', -1],
  ['concern', 'CONCERN', 2],
  ['revision-requested', 'REVISION_REQUESTED', 5],
];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function deadline(days) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function fixtureBriefing(slug) {
  return {
    jurisdictionId,
    slug: `demo-v2-partner-gate-${slug}`,
    title: `[Synthetic Demo] Partner gate: ${slug.replaceAll('-', ' ')}`,
    briefingType: 'CROSS_CUTTING',
    testimonyCount: 12,
    executiveSummary: 'Wholly fictional Briefing used to exercise partner assignment, deadline, decision, and publication-gate interfaces.',
    patternAnalysis: 'Synthetic workflow fixture. It is not a claim about a real organization, resident, or public system.',
    keyFindings: ['Assignment is visible to the partner.', 'The deadline is visible to administrators.', 'The decision is retained with reviewer provenance.'],
    recommendations: ['Use this record only for product and regression testing.'],
    generatedBy: 'synthetic_fixture',
    reviewStatus: 'REVIEWED',
    reviewedAt: now,
  };
}

function selfCheck() {
  assert.deepEqual(reviewFixtures.map((row) => row[1]), ['APPROVED', 'PENDING', 'CONCERN', 'REVISION_REQUESTED']);
  assert.equal(fixtureBriefing('pending-overdue').slug, 'demo-v2-partner-gate-pending-overdue');
  assert.ok(deadline(-1) < now);
}

async function findAdmin() {
  return prisma.user.findFirst({
    where: {
      jurisdictionId,
      email: adminEmail,
      userRoles: { some: { role: { name: 'ADMIN' } } },
    },
    select: { id: true, name: true, email: true },
  });
}

async function ensurePartnerReviewer(organizationId) {
  const role = await prisma.role.upsert({
    where: { name: 'ORG_MEMBER' },
    update: {},
    create: { name: 'ORG_MEMBER', description: 'Partner organization user.' },
  });
  const user = await prisma.user.upsert({
    where: { jurisdictionId_email: { jurisdictionId, email: partnerEmail } },
    update: {
      name: 'Synthetic Partner Reviewer (demo-v2)',
      organizationId,
      primaryRoleName: 'ORG_MEMBER',
    },
    create: {
      jurisdictionId,
      email: partnerEmail,
      name: 'Synthetic Partner Reviewer (demo-v2)',
      organizationId,
      primaryRoleName: 'ORG_MEMBER',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  return user;
}

async function upsertAssignment(tx, { briefingId, organizationId, adminId, partnerId, status, due }) {
  return tx.briefingPartnerReview.upsert({
    where: { briefingId_organizationId: { briefingId, organizationId } },
    update: {
      assignedByUserId: adminId,
      deadline: due,
      status,
      reviewedByUserId: status === 'PENDING' ? null : partnerId,
      reviewedAt: status === 'PENDING' ? null : now,
    },
    create: {
      jurisdictionId,
      briefingId,
      organizationId,
      assignedByUserId: adminId,
      deadline: due,
      status,
      reviewedByUserId: status === 'PENDING' ? null : partnerId,
      reviewedAt: status === 'PENDING' ? null : now,
    },
  });
}

async function seedDecisionFixtures({ organizationId, admin, partner }) {
  for (const [slug, status, dueDays] of reviewFixtures) {
    const data = fixtureBriefing(slug);
    const briefing = await prisma.briefing.upsert({
      where: { slug: data.slug },
      update: { ...data, reviewedByUserId: admin.id, publishedAt: null, ...emptyPartnerReviewOverride() },
      create: { ...data, reviewedByUserId: admin.id },
    });
    await prisma.$transaction(async (tx) => {
      await lockBriefingForUpdate(tx, briefing.id);
      await upsertAssignment(tx, {
        briefingId: briefing.id,
        organizationId,
        adminId: admin.id,
        partnerId: partner.id,
        status,
        due: deadline(dueDays),
      });
      if (status !== 'PENDING') {
        const content = `SYNTHETIC DEMO ${status}: deterministic partner-gate fixture for product regression.`;
        const existing = await tx.briefingReviewNote.findFirst({
          where: { briefingId: briefing.id, organizationId, partnerReviewStatus: status, content },
          select: { id: true },
        });
        if (!existing) {
          await tx.briefingReviewNote.create({
            data: {
              jurisdictionId,
              briefingId: briefing.id,
              userId: partner.id,
              organizationId,
              partnerReviewStatus: status,
              content,
            },
          });
        }
      }
    });
  }
}

async function approveAndPublish(briefing, { organizationId, admin, partner }) {
  await prisma.$transaction(async (tx) => {
    await lockBriefingForUpdate(tx, briefing.id);
    await upsertAssignment(tx, {
      briefingId: briefing.id,
      organizationId,
      adminId: admin.id,
      partnerId: partner.id,
      status: 'APPROVED',
      due: deadline(7),
    });
    if (briefing.targetAlgorithmId) {
      await tx.briefing.updateMany({
        where: {
          jurisdictionId,
          targetAlgorithmId: briefing.targetAlgorithmId,
          id: { not: briefing.id },
          reviewStatus: 'PUBLISHED',
        },
        data: { reviewStatus: 'REVIEWED', publishedAt: null },
      });
    }
    await tx.briefing.update({
      where: { id: briefing.id },
      data: {
        reviewStatus: 'PUBLISHED',
        reviewedByUserId: admin.id,
        reviewedAt: now,
        publishedAt: briefing.reviewStatus === 'PUBLISHED' && briefing.publishedAt ? briefing.publishedAt : now,
        ...emptyPartnerReviewOverride(),
      },
    });
  });
}

async function main() {
  selfCheck();
  if (args.has('--self-check')) {
    console.log('Briefing review demo data self-check ok');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const [admin, organization, published, refreshed] = await Promise.all([
    findAdmin(),
    prisma.organization.findFirst({
      where: { jurisdictionId, slug: partnerSlug, isActive: true },
      select: { id: true, name: true, slug: true },
    }),
    prisma.briefing.findMany({
      where: { jurisdictionId, reviewStatus: 'PUBLISHED' },
      select: { id: true, slug: true, targetAlgorithmId: true, reviewStatus: true, publishedAt: true },
    }),
    prisma.briefing.findMany({
      where: {
        jurisdictionId,
        reviewStatus: 'DRAFT',
        OR: [
          { slug: 'local-draft-cross-cutting' },
          { slug: { contains: '-refresh-' } },
        ],
      },
      select: { id: true, slug: true, targetAlgorithmId: true, reviewStatus: true, publishedAt: true },
    }),
  ]);
  if (!admin) throw new Error(`ADMIN reviewer ${adminEmail} was not found.`);
  if (!organization) throw new Error(`Synthetic partner ${partnerSlug} was not found. Seed demo-v2 data first.`);
  const targets = [...new Map([...published, ...refreshed].map((row) => [row.id, row])).values()];
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    admin: admin.email,
    partner: organization.name,
    publishedToBackfill: published.length,
    refreshedToPublish: refreshed.map((row) => row.slug),
    decisionFixtures: reviewFixtures.map(([slug, status, dueDays]) => ({ slug: `demo-v2-partner-gate-${slug}`, status, dueDays })),
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  const partner = await ensurePartnerReviewer(organization.id);
  await seedDecisionFixtures({ organizationId: organization.id, admin, partner });
  for (const briefing of targets) {
    await approveAndPublish(briefing, { organizationId: organization.id, admin, partner });
  }
  const invalidPublished = await prisma.briefing.count({
    where: {
      jurisdictionId,
      reviewStatus: 'PUBLISHED',
      OR: [
        { partnerReviews: { none: {} } },
        { partnerReviews: { some: { status: { not: 'APPROVED' } } } },
      ],
    },
  });
  assert.equal(invalidPublished, 0, 'Every published Briefing must have an approved partner assignment.');
  console.log(JSON.stringify({ ...summary, partnerReviewer: partner.email, invalidPublished }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
