import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { emptyPartnerReviewOverride, pendingPartnerReviewDecision } from '../lib/briefingPartnerReview.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const jurisdictionId = valueAfter('--jurisdiction') || process.env.JURISDICTION_ID || 'pittsburgh';
const outputDir = valueAfter('--output-dir') || 'task-briefings-results/stale-refresh';
const forceAlgorithm = valueAfter('--algorithm') || '';

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function loadEnvFiles() {
  for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    }
  }
}

function commandFor(row) {
  return [
    'scripts/briefings-narrative-draft.mjs',
    '--jurisdiction', jurisdictionId,
    '--algorithm', row.algorithmSlug,
    '--max-drafts', '1',
    '--allow-semantic-fallback',
    '--output', path.join(outputDir, `${row.algorithmSlug}.json`),
  ];
}

function toBriefingWrite(draft, refreshSlug) {
  const { generatedAt, slug, ...data } = draft;
  return {
    ...data,
    slug: refreshSlug,
    dateRangeStart: data.dateRangeStart ? new Date(`${data.dateRangeStart}T00:00:00.000Z`) : null,
    dateRangeEnd: data.dateRangeEnd ? new Date(`${data.dateRangeEnd}T00:00:00.000Z`) : null,
    reviewStatus: 'DRAFT',
    reviewedByUserId: null,
    reviewedAt: null,
    publishedAt: null,
  };
}

function findStale(rows) {
  const currentAlgorithms = new Set(rows
    .filter((row) => row.storedTestimonyCount === row.currentTestimonyCount)
    .map((row) => row.algorithmId));
  const staleByAlgorithm = new Map();
  for (const row of rows) {
    if (row.storedTestimonyCount === row.currentTestimonyCount || currentAlgorithms.has(row.algorithmId)) continue;
    const existing = staleByAlgorithm.get(row.algorithmId);
    if (
      !existing
      || (row.reviewStatus === 'PUBLISHED' && existing.reviewStatus !== 'PUBLISHED')
      || (row.reviewStatus === existing.reviewStatus && row.storedTestimonyCount > existing.storedTestimonyCount)
    ) staleByAlgorithm.set(row.algorithmId, row);
  }
  return [...staleByAlgorithm.values()];
}

function selectRefreshRows(rows, algorithmSlug = forceAlgorithm) {
  return algorithmSlug
    ? rows.filter((row) => row.algorithmSlug === algorithmSlug && row.reviewStatus === 'PUBLISHED')
    : findStale(rows);
}

function selfCheck() {
  const command = commandFor({ algorithmSlug: 'demo-algorithm' });
  assert(command.includes('--allow-semantic-fallback'));
  assert(command.includes(path.join(outputDir, 'demo-algorithm.json')));
  assert.equal(command.includes('--apply'), false);
  const write = toBriefingWrite({ slug: 'old', generatedAt: 'now', dateRangeStart: '2026-01-01' }, 'fresh');
  assert.equal(write.slug, 'fresh');
  assert.equal(write.reviewStatus, 'DRAFT');
  assert.equal(write.dateRangeStart.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(findStale([
    { algorithmId: 'a', storedTestimonyCount: 1, currentTestimonyCount: 2 },
    { algorithmId: 'a', storedTestimonyCount: 2, currentTestimonyCount: 2 },
    { algorithmId: 'b', storedTestimonyCount: 1, currentTestimonyCount: 3, reviewStatus: 'REVIEWED' },
    { algorithmId: 'b', storedTestimonyCount: 2, currentTestimonyCount: 3, reviewStatus: 'PUBLISHED' },
  ]).length, 1);
  assert.equal(findStale([
    { algorithmId: 'b', storedTestimonyCount: 1, currentTestimonyCount: 3, reviewStatus: 'REVIEWED' },
    { algorithmId: 'b', storedTestimonyCount: 2, currentTestimonyCount: 3, reviewStatus: 'PUBLISHED' },
  ])[0].storedTestimonyCount, 2);
  assert.equal(selectRefreshRows([
    { algorithmSlug: 'b', reviewStatus: 'REVIEWED' },
    { algorithmSlug: 'b', reviewStatus: 'PUBLISHED' },
  ], 'b').length, 1);
}

async function main() {
  selfCheck();
  if (args.has('--self-check')) {
    console.log('stale Briefing refresh self-check ok');
    return;
  }
  loadEnvFiles();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const prisma = new PrismaClient();
  try {
    const briefings = await prisma.briefing.findMany({
      where: {
        jurisdictionId,
        targetAlgorithmId: { not: null },
        reviewStatus: { in: ['REVIEWED', 'PUBLISHED'] },
      },
      orderBy: { slug: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        testimonyCount: true,
        reviewStatus: true,
        targetAlgorithm: { select: { id: true, slug: true, name: true } },
      },
    });
    const counts = await Promise.all(briefings.map((briefing) => prisma.testimony.count({
      where: {
        jurisdictionId,
        moderationStatus: 'APPROVED',
        algorithmLinks: { some: { algorithmId: briefing.targetAlgorithm.id } },
      },
    })));
    const rows = briefings.map((briefing, index) => ({
      algorithmId: briefing.targetAlgorithm.id,
      briefingSlug: briefing.slug,
      briefingTitle: briefing.title,
      algorithmSlug: briefing.targetAlgorithm.slug,
      algorithmName: briefing.targetAlgorithm.name,
      reviewStatus: briefing.reviewStatus,
      storedTestimonyCount: briefing.testimonyCount || 0,
      currentTestimonyCount: counts[index],
    }));
    const stale = selectRefreshRows(rows);
    if (forceAlgorithm && !stale.length) {
      throw new Error(`Published Briefing not found for forced algorithm "${forceAlgorithm}".`);
    }

    if (apply) {
      fs.mkdirSync(outputDir, { recursive: true });
      for (const row of stale) {
        const result = spawnSync(process.execPath, commandFor(row), { stdio: 'inherit', env: process.env });
        if (result.status !== 0) throw new Error(`Failed to regenerate ${row.algorithmSlug} (exit ${result.status}).`);
        const payload = JSON.parse(fs.readFileSync(path.join(outputDir, `${row.algorithmSlug}.json`), 'utf8'));
        const draft = payload.drafts?.[0];
        if (!draft) throw new Error(`No draft generated for ${row.algorithmSlug}.`);
        const refreshSlug = `${draft.slug}-refresh-${row.currentTestimonyCount}`;
        const data = toBriefingWrite(draft, refreshSlug);
        await prisma.$transaction(async (tx) => {
          const briefing = await tx.briefing.upsert({
            where: { slug: refreshSlug },
            update: { ...data, ...emptyPartnerReviewOverride() },
            create: { jurisdictionId, ...data },
          });
          await tx.briefingPartnerReview.updateMany({
            where: { briefingId: briefing.id },
            data: pendingPartnerReviewDecision(),
          });
        });
        row.createdDraftSlug = refreshSlug;
      }
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      jurisdictionId,
      forceAlgorithm: forceAlgorithm || null,
      checked: briefings.length,
      stale: stale.length,
      behavior: apply
        ? 'Created idempotent *-refresh-{count} drafts; existing reviewed/published Briefings were preserved.'
        : 'No database writes. Re-run with --apply to create fresh *-refresh-{count} drafts without replacing published Briefings.',
      rows: stale.map((row) => ({
        ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'algorithmId')),
        command: [process.execPath, ...commandFor(row)].join(' '),
      })),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
