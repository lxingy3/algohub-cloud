import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const inputPath = args.input || 'task345-results/briefings-local/task2-5-combined-results.json';
const dryRun = Boolean(args['dry-run']);
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

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

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const rows = (Array.isArray(payload.results) ? payload.results : []).map(cleanRow).filter((row) => row.id && row.aiImpactClassification);
  const existing = await prisma.testimony.findMany({
    where: { jurisdictionId, moderationStatus: 'APPROVED', id: { in: rows.map((row) => row.id) } },
    select: { id: true },
  });
  const allowed = new Set(existing.map((row) => row.id));
  const selected = rows.filter((row) => allowed.has(row.id));
  if (dryRun) {
    console.log(JSON.stringify({ inputPath, dryRun, inputRows: rows.length, selectedRows: selected.length, lowConfidence: selected.filter((row) => row.aiConfidenceScore <= 0.85).length }, null, 2));
    return;
  }
  await prisma.$transaction(selected.map((row) => prisma.testimony.update({
    where: { id: row.id },
    data: {
      aiImpactClassification: row.aiImpactClassification,
      aiConfidenceScore: row.aiConfidenceScore,
      aiThemes: row.aiThemes,
      aiExtractedExperiences: row.aiExtractedExperiences,
      aiProcessedAt: new Date(),
    },
  })), { maxWait: 10000, timeout: 120000 });
  console.log(JSON.stringify({ inputPath, dryRun, updated: selected.length, lowConfidence: selected.filter((row) => row.aiConfidenceScore <= 0.85).length }, null, 2));
}

main().finally(async () => prisma.$disconnect());
