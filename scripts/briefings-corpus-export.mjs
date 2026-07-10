import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();

const args = parseArgs(process.argv.slice(2));
const outputPath = args.output || 'task-briefings-results/corpus-batch-input.json';
const jurisdictionId = args.jurisdiction || process.env.JURISDICTION_ID || 'pittsburgh';
const status = args.status || 'APPROVED';

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

function cleanText(parts) {
  const text = parts.filter(Boolean).join('\n\n').replace(/\s+/g, ' ').trim();
  if (text.length <= 4000) return { text, truncated: false };
  return {
    text: `${text.slice(0, 2200).trim()} ... ${text.slice(-1800).trim()}`,
    truncated: true,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const [testimonies, algorithms, crossJurisdictionInsights] = await Promise.all([
    prisma.testimony.findMany({
      where: {
        jurisdictionId,
        moderationStatus: status,
        OR: [
          { narrativeText: { not: '' } },
          { transcriptionText: { not: null } },
        ],
      },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        title: true,
        summary: true,
        narrativeText: true,
        transcriptionText: true,
        affectedDomain: true,
        originalLanguage: true,
        submittedAt: true,
        aiLinkedAlgorithmIds: true,
        aiExtractedExperiences: true,
        algorithmLinks: { select: { algorithmId: true } },
      },
    }),
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        purpose: true,
        useCase: true,
        agencyName: true,
        dataUsed: true,
        decisionType: true,
        impactLevel: true,
        yearDeployed: true,
        claims: { select: { id: true, claimText: true, claimSource: true, claimDate: true } },
      },
    }),
    prisma.crossJurisdictionInsight.findMany({
      where: { isApproved: true },
      select: { id: true, useCase: true, insightType: true, insightData: true },
    }),
  ]);

  const records = testimonies.map((testimony) => {
    const { text, truncated } = cleanText([
      testimony.title,
      testimony.summary,
      testimony.narrativeText,
      testimony.transcriptionText,
    ]);
    return {
      id: testimony.id,
      title: testimony.title,
      narrativeText: cleanText([testimony.narrativeText, testimony.transcriptionText]).text,
      affectedDomain: testimony.affectedDomain,
      originalLanguage: testimony.originalLanguage,
      submittedAt: testimony.submittedAt?.toISOString?.() || null,
      algorithmIds: [
        ...new Set([
          ...(testimony.aiLinkedAlgorithmIds || []),
          ...testimony.algorithmLinks.map((link) => link.algorithmId),
        ]),
      ],
      analysisText: text,
      knownEntityExclusions: Object.values(testimony.aiExtractedExperiences?.entities || {})
        .flatMap((values) => Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
      truncated,
    };
  }).filter((record) => record.analysisText);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const algorithmRecords = algorithms.map((algorithm) => ({
    id: algorithm.id,
    slug: algorithm.slug,
    name: algorithm.name,
    useCase: algorithm.useCase,
    impactLevel: algorithm.impactLevel,
    yearDeployed: algorithm.yearDeployed,
    analysisText: cleanText([
      algorithm.name,
      algorithm.description,
      algorithm.purpose,
      algorithm.useCase,
      algorithm.agencyName,
      algorithm.dataUsed,
      algorithm.decisionType,
    ]).text,
    claims: algorithm.claims.map((claim) => ({
      id: claim.id,
      text: claim.claimText,
      source: claim.claimSource,
      date: claim.claimDate?.toISOString?.().slice(0, 10) || null,
    })),
  }));

  fs.writeFileSync(outputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    jurisdictionId,
    moderationStatus: status,
    records,
    algorithms: algorithmRecords,
    crossJurisdictionInsights: crossJurisdictionInsights.map((insight) => ({
      id: insight.id,
      useCase: insight.useCase,
      analysisText: cleanText([insight.useCase, insight.insightType, JSON.stringify(insight.insightData)]).text,
    })),
  }, null, 2)}\n`);

  console.log(JSON.stringify({
    outputPath,
    jurisdictionId,
    status,
    records: records.length,
    algorithms: algorithmRecords.length,
    claims: algorithmRecords.reduce((sum, algorithm) => sum + algorithm.claims.length, 0),
    crossJurisdictionInsights: crossJurisdictionInsights.length,
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
