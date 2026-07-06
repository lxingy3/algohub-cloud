import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const outputPath = args.output || 'task-briefings-results/briefing-narrative-drafts.json';
const jurisdictionId = args.jurisdiction || process.env.JURISDICTION_ID || 'pittsburgh';
const apply = Boolean(args.apply);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (parsed[key] === next) index += 1;
  }
  return parsed;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function normalizeThemes(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => typeof item === 'string' ? item : item?.theme || item?.label || item?.name)
    .filter(Boolean);
}

function topCounts(items, limit = 5) {
  const counts = new Map();
  for (const item of items.filter(Boolean)) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function labels(rows) {
  return rows.length ? rows.map((row) => row.label).join(', ') : 'not enough reviewed data yet';
}

function buildDraft({ algorithm = null, rows, generatedAt }) {
  const themes = topCounts(rows.flatMap((row) => normalizeThemes(row.aiThemes)));
  const impacts = topCounts(rows.map((row) => row.aiImpactClassification || row.selfReportedImpact || 'UNCLEAR'));
  const domains = topCounts(rows.map((row) => row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain'));
  const outliers = rows.filter((row) => row.isOutlier).length;
  const title = algorithm ? `${algorithm.name} briefing draft` : 'Cross-cutting briefing draft';
  const slug = algorithm ? `local-draft-${algorithm.slug}` : 'local-draft-cross-cutting';
  const dateValues = rows.map((row) => row.submittedAt).filter(Boolean).sort((a, b) => a - b);

  return {
    title,
    slug,
    briefingType: algorithm ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING',
    targetAlgorithmId: algorithm?.id || null,
    targetTheme: null,
    dateRangeStart: dateValues[0]?.toISOString?.().slice(0, 10) || null,
    dateRangeEnd: dateValues.at(-1)?.toISOString?.().slice(0, 10) || null,
    testimonyCount: rows.length,
    executiveSummary: `${rows.length} approved stories are included in this draft. The strongest suggested themes are ${labels(themes)}; the main domains represented are ${labels(domains)}.`,
    keyFindings: [
      { label: 'Suggested themes', items: themes },
      { label: 'Impact mix', items: impacts },
      { label: 'Represented domains', items: domains },
      { label: 'Less common experiences', count: outliers },
    ],
    patternAnalysis: `This is a local rule-based draft generated from cached Task 2-5 labels and corpus batch fields. It is meant for review, not publication as an adjudicated finding.`,
    silenceGaps: domains.length ? [] : [{ reason: 'No domain coverage available in the approved story set.' }],
    recommendations: [
      'Review low-coverage domains before publishing.',
      'Keep claim-vs-experience language descriptive until human review.',
      'Use original excerpts only where the lens allows story-level display.',
    ],
    claimVsExperience: (algorithm ? [algorithm] : [])
      .map((item) => ({
        algorithmSlug: item.slug,
        algorithmName: item.name,
        claims: item.claims.map((claim) => ({ text: claim.claimText, source: claim.claimSource, date: claim.claimDate })),
        experienceCount: rows.filter((row) => row.algorithmLinks.some((link) => link.algorithm.id === item.id)).length,
      })),
    generatedBy: 'local_rule_draft',
    reviewStatus: 'DRAFT',
    generatedAt,
  };
}

function toBriefingWrite(draft) {
  const { generatedAt, ...data } = draft;
  return data;
}

async function main() {
  if (args['self-check']) {
    assert.deepEqual(topCounts(['b', 'a', 'b']), [{ label: 'b', count: 2 }, { label: 'a', count: 1 }]);
    assert.equal(labels([]), 'not enough reviewed data yet');
    console.log('briefings narrative draft self-check ok');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const [algorithms, testimonies] = await Promise.all([
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        claims: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        submittedAt: true,
        affectedDomain: true,
        selfReportedImpact: true,
        aiImpactClassification: true,
        aiThemes: true,
        isOutlier: true,
        algorithmLinks: {
          select: {
            algorithm: { select: { id: true, slug: true, name: true, useCase: true } },
          },
        },
      },
    }),
  ]);

  const generatedAt = new Date().toISOString();
  const drafts = [
    buildDraft({ rows: testimonies, generatedAt }),
    ...algorithms.map((algorithm) => buildDraft({
      algorithm,
      rows: testimonies.filter((row) => row.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)),
      generatedAt,
    })).filter((draft) => draft.testimonyCount > 0),
  ];

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt, jurisdictionId, apply, drafts }, null, 2)}\n`);

  if (apply) {
    for (const draft of drafts) {
      const data = toBriefingWrite(draft);
      await prisma.briefing.upsert({
        where: { slug: draft.slug },
        update: data,
        create: { jurisdictionId, ...data },
      });
    }
  }

  console.log(JSON.stringify({ outputPath, jurisdictionId, apply, drafts: drafts.length }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
