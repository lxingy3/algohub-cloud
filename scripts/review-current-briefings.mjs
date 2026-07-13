import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) loadEnvFile(file);
const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const publish = args.has('--publish');
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const reviewerEmail = process.env.BRIEFINGS_REVIEWER_EMAIL || 'xil594@pitt.edu';
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

function reviewDraft(briefing) {
  const issues = [];
  if (!briefing.executiveSummary || briefing.executiveSummary.trim().length < 80) issues.push('summary is too short');
  if (list(briefing.keyFindings).length < 3) issues.push('fewer than three findings');
  if (list(briefing.recommendations).length < 1) issues.push('no recommendation');
  if (!briefing.testimonyCount || briefing.testimonyCount < 1) issues.push('no approved story evidence');
  if (briefing.generatedBy !== 'staff_draft') issues.push('unknown generation source');
  if (briefing.briefingType === 'ALGORITHM_SPECIFIC' && !briefing.targetAlgorithmId) issues.push('algorithm is missing');
  if (briefing.dateRangeEnd && briefing.dateRangeEnd > today) issues.push('future-dated evidence');
  const canPublish = issues.length === 0 && (briefing.briefingType === 'CROSS_CUTTING' || briefing.testimonyCount >= 2);
  return {
    id: briefing.id,
    slug: briefing.slug,
    testimonyCount: briefing.testimonyCount,
    issues,
    nextStatus: issues.length ? 'DRAFT' : publish && canPublish ? 'PUBLISHED' : 'REVIEWED',
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const reviewer = await prisma.user.findFirst({
    where: { jurisdictionId, email: reviewerEmail },
    select: { id: true, name: true, email: true },
  });
  if (!reviewer) throw new Error(`Reviewer ${reviewerEmail} was not found.`);
  const drafts = await prisma.briefing.findMany({
    where: { jurisdictionId, slug: { startsWith: 'local-draft-' } },
    orderBy: { slug: 'asc' },
  });
  const decisions = drafts.map(reviewDraft);
  const publishable = decisions.filter((item) => item.nextStatus === 'PUBLISHED');

  if (apply) {
    await prisma.$transaction(async (tx) => {
      if (publish && publishable.length) {
        await tx.briefing.updateMany({
          where: { jurisdictionId, generatedBy: 'seed', reviewStatus: 'PUBLISHED' },
          data: { reviewStatus: 'DRAFT', publishedAt: null },
        });
      }
      for (const decision of decisions) {
        await tx.briefing.update({
          where: { id: decision.id },
          data: {
            reviewStatus: decision.nextStatus,
            reviewedByUserId: decision.issues.length ? null : reviewer.id,
            reviewedAt: decision.issues.length ? null : new Date(),
            publishedAt: decision.nextStatus === 'PUBLISHED' ? new Date() : null,
          },
        });
      }
    });
  }

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
