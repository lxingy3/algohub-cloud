import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { evaluatePartnerPublicationGate, lockBriefingForUpdate } from '../lib/briefingPartnerReview.js';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) loadEnvFile(file);
const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const publish = args.has('--publish');
const overrideReason = valueAfter('--override-reason') || '';
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const reviewerEmail = process.env.BRIEFINGS_REVIEWER_EMAIL || 'admin@algostories.local';
const today = new Date();

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
}

function reviewDraft(briefing) {
  const contentIssues = [];
  if (!briefing.executiveSummary || briefing.executiveSummary.trim().length < 80) contentIssues.push('summary is too short');
  if (list(briefing.keyFindings).length < 3) contentIssues.push('fewer than three findings');
  if (list(briefing.recommendations).length < 1) contentIssues.push('no recommendation');
  if (!briefing.testimonyCount || briefing.testimonyCount < 1) contentIssues.push('no approved story evidence');
  if (briefing.generatedBy !== 'staff_draft') contentIssues.push('unknown generation source');
  if (briefing.briefingType === 'ALGORITHM_SPECIFIC' && !briefing.targetAlgorithmId) contentIssues.push('algorithm is missing');
  if (briefing.dateRangeEnd && briefing.dateRangeEnd > today) contentIssues.push('future-dated evidence');
  const partnerGate = evaluatePartnerPublicationGate(briefing.partnerReviews, {
    enabled: Boolean(overrideReason || briefing.partnerReviewOverriddenAt),
    reason: overrideReason || briefing.partnerReviewOverrideReason,
  });
  const publishIssues = publish && !partnerGate.allowed ? ['partner review gate is not satisfied'] : [];
  const issues = [...contentIssues, ...publishIssues];
  const canPublish = contentIssues.length === 0
    && partnerGate.allowed
    && (briefing.briefingType === 'CROSS_CUTTING' || briefing.testimonyCount >= 2);
  return {
    id: briefing.id,
    slug: briefing.slug,
    testimonyCount: briefing.testimonyCount,
    issues,
    nextStatus: contentIssues.length ? 'DRAFT' : publish && canPublish ? 'PUBLISHED' : 'REVIEWED',
    partnerGate: {
      assignmentCount: partnerGate.assignmentCount,
      allApproved: partnerGate.allApproved,
      overridden: partnerGate.overridden,
    },
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const reviewer = await prisma.user.findFirst({
    where: { jurisdictionId, email: reviewerEmail },
    select: {
      id: true,
      name: true,
      email: true,
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!reviewer) throw new Error(`Reviewer ${reviewerEmail} was not found.`);
  const reviewerRoles = new Set(reviewer.userRoles.map(({ role }) => role.name));
  if ((publish || overrideReason) && !reviewerRoles.has('ADMIN')) {
    throw new Error(`Reviewer ${reviewerEmail} must have the ADMIN role to publish or override partner review.`);
  }
  if (overrideReason && (overrideReason.length < 10 || overrideReason.length > 1000)) {
    throw new Error('Override reason must be 10 to 1,000 characters.');
  }
  const briefingQuery = {
    where: {
      jurisdictionId,
      slug: { startsWith: 'local-draft-' },
      reviewStatus: { in: ['DRAFT', 'REVIEWED'] },
    },
    orderBy: { slug: 'asc' },
    include: {
      partnerReviews: { select: { status: true, organization: { select: { isActive: true } } } },
    },
  };
  let decisions = (await prisma.briefing.findMany(briefingQuery)).map(reviewDraft);

  if (apply) {
    decisions = await prisma.$transaction(async (tx) => {
      const ids = await tx.briefing.findMany({
        where: briefingQuery.where,
        orderBy: briefingQuery.orderBy,
        select: { id: true },
      });
      for (const { id } of ids) await lockBriefingForUpdate(tx, id);
      const lockedDrafts = ids.length
        ? await tx.briefing.findMany({
          where: {
            ...briefingQuery.where,
            id: { in: ids.map(({ id }) => id) },
          },
          orderBy: briefingQuery.orderBy,
          include: briefingQuery.include,
        })
        : [];
      const lockedDecisions = lockedDrafts.map(reviewDraft);
      const publishable = lockedDecisions.filter((item) => item.nextStatus === 'PUBLISHED');
      if (publish && publishable.length) {
        await tx.briefing.updateMany({
          where: { jurisdictionId, generatedBy: 'seed', reviewStatus: 'PUBLISHED' },
          data: { reviewStatus: 'DRAFT', publishedAt: null },
        });
      }
      for (const decision of lockedDecisions) {
        await tx.briefing.update({
          where: { id: decision.id },
          data: {
            reviewStatus: decision.nextStatus,
            reviewedByUserId: decision.nextStatus === 'DRAFT' ? null : reviewer.id,
            reviewedAt: decision.nextStatus === 'DRAFT' ? null : new Date(),
            publishedAt: decision.nextStatus === 'PUBLISHED' ? new Date() : null,
            ...(decision.nextStatus === 'PUBLISHED' && decision.partnerGate.overridden && overrideReason ? {
              partnerReviewOverrideReason: overrideReason,
              partnerReviewOverriddenByUserId: reviewer.id,
              partnerReviewOverriddenAt: new Date(),
            } : {}),
          },
        });
      }
      return lockedDecisions;
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  const publishable = decisions.filter((item) => item.nextStatus === 'PUBLISHED');
  console.log(JSON.stringify({
    apply,
    publish,
    reviewer: reviewer.name || reviewer.email,
    drafts: decisions.length,
    published: publishable.length,
    reviewedOnly: decisions.filter((item) => item.nextStatus === 'REVIEWED').length,
    blocked: decisions.filter((item) => item.issues.length).length,
    decisions,
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
