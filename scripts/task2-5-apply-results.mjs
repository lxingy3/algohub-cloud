import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const inputPath = args.input || 'task345-results/briefings-local-spec/task2-5-combined-results.json';
const evalSetPath = args['eval-set'] || 'data/task2-5-eval-set.json';
const dryRun = Boolean(args['dry-run']);
const benchmarkOnly = Boolean(args['benchmark-only']);
const force = Boolean(args.force);
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const IMPACT_LABELS = new Set(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']);
const THEME_LABELS = new Set([
  'opacity', 'lack_of_recourse', 'arbitrary_outcome', 'discriminatory_impact', 'data_accuracy',
  'positive_experience', 'process_confusion', 'delayed_outcome', 'lack_of_notification', 'loss_of_dignity',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const next = argv[index + 1];
    parsed[key.slice(2)] = next && !next.startsWith('--') ? next : true;
    if (parsed[key.slice(2)] === next) index += 1;
  }
  return parsed;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function cleanRow(row) {
  const confidence = Number(row.aiConfidenceScore);
  return {
    id: String(row.id || ''),
    aiImpactClassification: ['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR'].includes(row.aiImpactClassification) ? row.aiImpactClassification : null,
    aiConfidenceScore: Number.isFinite(confidence) ? confidence : null,
    aiThemes: Array.isArray(row.aiThemes) ? row.aiThemes.filter((theme) => Number(theme?.confidence) > 0.5) : [],
    aiExtractedExperiences: row.aiExtractedExperiences && typeof row.aiExtractedExperiences === 'object' ? row.aiExtractedExperiences : { entities: {}, keywords: [] },
  };
}

function evaluateRows(rows) {
  if (!fs.existsSync(evalSetPath)) return null;
  const payload = JSON.parse(fs.readFileSync(evalSetPath, 'utf8'));
  const expectedRows = Array.isArray(payload) ? payload : payload.records || [];
  const curatedBy = Array.isArray(payload) ? '' : String(payload.curatedBy || '').trim();
  const approvalRequested = Boolean(!Array.isArray(payload) && payload.approvedForRelease === true);
  const seenIds = new Set();
  const invalidBenchmarkRows = expectedRows.filter((row) => {
    const id = String(row.id || '');
    const duplicate = !id || seenIds.has(id);
    seenIds.add(id);
    return duplicate
      || !IMPACT_LABELS.has(row.expectedImpact)
      || !Array.isArray(row.expectedThemes)
      || row.expectedThemes.some((theme) => !THEME_LABELS.has(theme));
  });
  const approvedForRelease = Boolean(approvalRequested && curatedBy && expectedRows.length >= 50 && !invalidBenchmarkRows.length);
  const byId = new Map(rows.map((row) => [row.id, row]));
  let matched = 0;
  let correctImpact = 0;
  let expectedThemeCount = 0;
  let foundThemeCount = 0;
  for (const expected of expectedRows) {
    const row = byId.get(String(expected.id));
    if (!row) continue;
    matched += 1;
    if (row.aiImpactClassification === expected.expectedImpact) correctImpact += 1;
    const actualThemes = new Set(row.aiThemes.map((theme) => theme.theme).filter(Boolean));
    for (const theme of expected.expectedThemes || []) {
      expectedThemeCount += 1;
      if (actualThemes.has(theme)) foundThemeCount += 1;
    }
  }
  if (!matched) return null;
  const impactAccuracy = correctImpact / matched;
  const themeRecall = expectedThemeCount ? foundThemeCount / expectedThemeCount : 0;
  const minimumBenchmarkSize = 50;
  const enoughMatchedRows = matched >= minimumBenchmarkSize;
  return {
    evalSetPath,
    approvedForRelease,
    benchmarkSize: expectedRows.length,
    curatedBy: curatedBy || null,
    invalidBenchmarkRows: invalidBenchmarkRows.length,
    matched,
    impactAccuracy: Number(impactAccuracy.toFixed(4)),
    themeRecall: Number(themeRecall.toFixed(4)),
    requiredImpactAccuracy: 0.75,
    requiredThemeRecall: 0.7,
    minimumBenchmarkSize,
    passed: approvedForRelease && enoughMatchedRows && impactAccuracy >= 0.75 && themeRecall >= 0.7,
    reason: !approvalRequested || !curatedBy || expectedRows.length < minimumBenchmarkSize
      ? 'Release benchmark must be research-team approved and contain at least 50 labeled records.'
      : invalidBenchmarkRows.length
        ? `Release benchmark contains ${invalidBenchmarkRows.length} missing, duplicate, or invalid label rows.`
      : !enoughMatchedRows
        ? 'At least 50 approved benchmark records must match model output.'
        : null,
  };
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const modelProvenance = payload.models && typeof payload.models === 'object'
    ? { ...payload.models, generatedAt: payload.generatedAt || null }
    : null;
  const rows = (Array.isArray(payload.results) ? payload.results : []).map(cleanRow).filter((row) => row.id && row.aiImpactClassification);
  const benchmark = evaluateRows(rows);
  if (benchmarkOnly) {
    console.log(JSON.stringify({ inputPath, evalSetPath, benchmarkOnly: true, inputRows: rows.length, benchmark }, null, 2));
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const databaseRows = rows.filter((row) => UUID_PATTERN.test(row.id));
  const existing = await prisma.testimony.findMany({
    where: { jurisdictionId, moderationStatus: 'APPROVED', id: { in: databaseRows.map((row) => row.id) } },
    select: { id: true },
  });
  const allowed = new Set(existing.map((row) => row.id));
  const selected = databaseRows.filter((row) => allowed.has(row.id));
  if (dryRun) {
    console.log(JSON.stringify({ inputPath, dryRun, inputRows: rows.length, selectedRows: selected.length, lowConfidence: selected.filter((row) => row.aiConfidenceScore <= 0.85).length, benchmark }, null, 2));
    return;
  }
  if (benchmark && !benchmark.passed && !force) {
    throw new Error(`Task 2-5 benchmark failed: impact accuracy ${benchmark.impactAccuracy}, theme recall ${benchmark.themeRecall}. Use --force only after human approval.`);
  }
  await prisma.$transaction(selected.map((row) => prisma.testimony.update({
    where: { id: row.id },
    data: {
      aiImpactClassification: row.aiImpactClassification,
      aiConfidenceScore: row.aiConfidenceScore,
      aiThemes: row.aiThemes,
      aiExtractedExperiences: modelProvenance
        ? { ...row.aiExtractedExperiences, modelProvenance }
        : row.aiExtractedExperiences,
      aiProcessedAt: new Date(),
    },
  })), { maxWait: 10000, timeout: 120000 });
  console.log(JSON.stringify({ inputPath, dryRun, updated: selected.length, lowConfidence: selected.filter((row) => row.aiConfidenceScore <= 0.85).length, benchmark }, null, 2));
}

main().finally(async () => prisma.$disconnect());
