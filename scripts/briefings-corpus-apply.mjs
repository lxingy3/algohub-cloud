import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const inputPath = args.input || 'task-briefings-results/corpus-batch-results.json';
const dryRun = Boolean(args['dry-run']);
const limit = Number.isFinite(Number(args.limit)) ? Number(args.limit) : Infinity;
const allowSmallCorpus = Boolean(args['allow-small-corpus']);

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

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

async function assertBriefingSchemaReady() {
  const rows = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'testimonies'
      AND column_name IN ('cluster_id', 'is_outlier', 'topic_id', 'umap_x', 'umap_y')
  `;
  const columns = new Set(rows.map((row) => row.column_name));
  const missing = ['cluster_id', 'is_outlier', 'topic_id', 'umap_x', 'umap_y'].filter((column) => !columns.has(column));
  const tableRows = await prisma.$queryRaw`SELECT to_regclass('public.corpus_topics')::text AS table_name`;
  const hasCorpusTopics = Boolean(tableRows?.[0]?.table_name);
  if (missing.length || !hasCorpusTopics) {
    throw new Error(`Briefings schema migration is not applied. Missing: ${[...missing, hasCorpusTopics ? null : 'corpus_topics'].filter(Boolean).join(', ')}`);
  }
}

function cleanRecord(row, validTopicIds) {
  const topicId = row.topicId === null || row.topicId === undefined ? null : Number(row.topicId);
  return {
    id: String(row.id || ''),
    clusterId: row.clusterId === null || row.clusterId === undefined ? null : Number(row.clusterId),
    isOutlier: Boolean(row.isOutlier),
    topicId: Number.isInteger(topicId) && validTopicIds.has(topicId) ? topicId : null,
    umapX: row.umapX === null || row.umapX === undefined ? null : Number(row.umapX),
    umapY: row.umapY === null || row.umapY === undefined ? null : Number(row.umapY),
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const topics = requireArray(payload.topics, 'topics');
  const records = requireArray(payload.records, 'records');
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  if (!allowSmallCorpus && warnings.some((warning) => String(warning).includes('fewer than 5'))) {
    throw new Error('Refusing to apply a small-corpus batch. Review JSON only, or pass --allow-small-corpus intentionally.');
  }

  await assertBriefingSchemaReady();

  const validTopicIds = new Set(topics.map((topic) => Number(topic.topicId)).filter(Number.isInteger));
  const cleanRecords = records.map((record) => cleanRecord(record, validTopicIds)).filter((record) => record.id);
  const selectedRecords = cleanRecords.slice(0, limit);
  const now = new Date();

  if (dryRun) {
    console.log(JSON.stringify({
      inputPath,
      dryRun: true,
      topics: topics.length,
      records: cleanRecords.length,
      selectedRecords: selectedRecords.length,
      warnings,
      sample: selectedRecords.slice(0, 3),
    }, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const topic of topics) {
      const topicId = Number(topic.topicId);
      if (!Number.isInteger(topicId) || topicId < 0) continue;
      await tx.corpusTopic.upsert({
        where: { topicId },
        update: {
          label: topic.label || null,
          topKeywords: Array.isArray(topic.topKeywords) ? topic.topKeywords : [],
          size: Number.isFinite(Number(topic.size)) ? Number(topic.size) : null,
          spanAlgorithms: Number.isFinite(Number(topic.spanAlgorithms)) ? Number(topic.spanAlgorithms) : null,
          spanDomains: Number.isFinite(Number(topic.spanDomains)) ? Number(topic.spanDomains) : null,
          updatedAt: now,
        },
        create: {
          topicId,
          label: topic.label || null,
          topKeywords: Array.isArray(topic.topKeywords) ? topic.topKeywords : [],
          size: Number.isFinite(Number(topic.size)) ? Number(topic.size) : null,
          spanAlgorithms: Number.isFinite(Number(topic.spanAlgorithms)) ? Number(topic.spanAlgorithms) : null,
          spanDomains: Number.isFinite(Number(topic.spanDomains)) ? Number(topic.spanDomains) : null,
          updatedAt: now,
        },
      });
    }

    for (const record of selectedRecords) {
      await tx.testimony.update({
        where: { id: record.id },
        data: {
          clusterId: Number.isFinite(record.clusterId) ? record.clusterId : null,
          isOutlier: record.isOutlier,
          topicId: record.topicId,
          umapX: Number.isFinite(record.umapX) ? record.umapX : null,
          umapY: Number.isFinite(record.umapY) ? record.umapY : null,
        },
      });
    }
  }, { maxWait: 10000, timeout: 30000 });

  const relationSample = await prisma.testimony.findFirst({
    where: { topicId: { not: null } },
    select: { id: true, topicId: true, corpusTopic: { select: { label: true } } },
  });
  console.log(JSON.stringify({
    inputPath,
    dryRun: false,
    topicsUpserted: topics.length,
    recordsUpdated: selectedRecords.length,
    relationSample,
    warnings,
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
