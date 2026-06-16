import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const inputPath = process.argv[2] || 'task345-results/existing-stories-ml-output/task2-5-combined-results.json';

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const results = asArray(payload.results);
  let updated = 0;
  let skipped = 0;

  for (const row of results) {
    const id = String(row.id || '').trim();
    if (!id) {
      skipped += 1;
      continue;
    }

    const entities = row.aiExtractedExperiences?.entities || {};
    const keywords = row.aiExtractedExperiences?.keywords || [];
    await prisma.testimony.update({
      where: { id },
      data: {
        aiImpactClassification: row.aiImpactClassification || null,
        aiConfidenceScore: Number.isFinite(Number(row.aiConfidenceScore)) ? Number(row.aiConfidenceScore) : null,
        aiThemes: asArray(row.aiThemes),
        aiExtractedExperiences: {
          entities,
          keywords: asArray(keywords),
        },
        aiProcessedAt: new Date(),
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ inputPath, results: results.length, updated, skipped }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
