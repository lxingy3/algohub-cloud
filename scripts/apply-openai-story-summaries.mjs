import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const inputPaths = process.argv.slice(2).filter((value) => !value.startsWith('--'));
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const modelName = 'OpenAI Codex (user-authorized 2026-07-14)';

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function readSummaries(paths) {
  const rows = paths.flatMap((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  const seen = new Set();
  return rows.map((row) => {
    const id = String(row?.id || '').trim();
    const summary = String(row?.summary || '').replace(/\s+/g, ' ').trim();
    if (!id || seen.has(id)) throw new Error(`Missing or duplicate testimony id: ${id || '(empty)'}`);
    if (!summary || summary.length > 240) throw new Error(`Summary for ${id} must contain 1-240 characters.`);
    seen.add(id);
    return { id, summary };
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!inputPaths.length) throw new Error('Pass one or more summary JSON files.');
  const summaries = readSummaries(inputPaths);
  const eligible = await prisma.testimony.findMany({
    where: {
      jurisdictionId,
      id: { in: summaries.map((row) => row.id) },
      moderationStatus: 'APPROVED',
      publicPosting: true,
    },
    select: { id: true },
  });
  const eligibleIds = new Set(eligible.map((row) => row.id));
  const blocked = summaries.filter((row) => !eligibleIds.has(row.id)).map((row) => row.id);
  if (blocked.length) {
    throw new Error(`Refusing to summarize non-public or unapproved testimonies: ${blocked.join(', ')}`);
  }

  if (apply) {
    await prisma.$transaction(async (tx) => {
      const generatedAt = new Date();
      for (const row of summaries) {
        const updated = await tx.testimony.updateMany({
          where: {
            id: row.id,
            jurisdictionId,
            moderationStatus: 'APPROVED',
            publicPosting: true,
          },
          data: { summary: row.summary },
        });
        if (updated.count !== 1) {
          throw new Error(`Eligibility changed while applying summary for ${row.id}; transaction aborted.`);
        }
        await tx.testimonyBrief.upsert({
          where: { testimonyId: row.id },
          create: {
            testimonyId: row.id,
            jurisdictionId,
            summary: row.summary,
            keyExcerpts: [],
            modelName,
            generatedAt,
            reviewStatus: 'DRAFT',
            reviewedByUserId: null,
          },
          update: {
            summary: row.summary,
            keyExcerpts: [],
            modelName,
            generatedAt,
            reviewStatus: 'DRAFT',
            reviewedByUserId: null,
          },
        });
      }
    }, { timeout: 180_000, maxWait: 30_000 });
  }

  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    jurisdictionId,
    modelName,
    summaries: summaries.length,
    publicApproved: eligible.length,
  }, null, 2));
}

main().finally(async () => prisma.$disconnect());
