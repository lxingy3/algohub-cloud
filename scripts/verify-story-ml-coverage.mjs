import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();

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

function hasArrayItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function getEntities(row) {
  return row.aiExtractedExperiences?.entities || {};
}

function getKeywords(row) {
  return row.aiExtractedExperiences?.keywords || [];
}

function missingReasons(row) {
  const entities = getEntities(row);
  const reasons = [];
  if (!row.aiImpactClassification) reasons.push('task2_impact');
  if (!Number.isFinite(Number(row.aiConfidenceScore))) reasons.push('task2_confidence');
  if (!hasArrayItems(row.aiThemes)) reasons.push('task3_themes');
  if (!hasArrayItems(entities.agencies)) reasons.push('task4_agencies');
  if (!hasArrayItems(entities.locations)) reasons.push('task4_locations');
  if (!hasArrayItems(entities.systems)) reasons.push('task4_systems');
  if (!hasArrayItems(entities.dates)) reasons.push('task4_dates');
  if (!hasArrayItems(entities.people_roles)) reasons.push('task4_people_roles');
  if (!hasArrayItems(getKeywords(row))) reasons.push('task5_keywords');
  if (['voice', 'audio'].includes(String(row.storyType || '').toLowerCase()) && !row.transcriptionText) {
    reasons.push('task1_transcript');
  }
  return reasons;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const jurisdictionId = process.argv[2] || 'pittsburgh';
  const rows = await prisma.testimony.findMany({
    where: { jurisdictionId },
    orderBy: { submittedAt: 'asc' },
    select: {
      title: true,
      city: true,
      zipCode: true,
      occurredAtText: true,
      affectedDomain: true,
      aiImpactClassification: true,
      aiConfidenceScore: true,
      aiThemes: true,
      aiExtractedExperiences: true,
      aiProcessedAt: true,
      storyType: true,
      transcriptionText: true,
      transcriptionStatus: true,
      moderationStatus: true,
    },
  });

  const stats = {
    count: rows.length,
    completeTask2To5: 0,
    completeTask1ForVoice: 0,
    missingAnyTask2To5: 0,
    missingAnyTask: 0,
    withAgency: 0,
    withLocation: 0,
    withSystem: 0,
    withDate: 0,
    withRole: 0,
    withKeywords: 0,
    withTask2Impact: 0,
    withTask2Confidence: 0,
    withTask3Themes: 0,
    voiceCount: 0,
    voiceWithTranscript: 0,
  };
  const missingByReason = {};
  const incomplete = [];

  for (const row of rows) {
    const entities = getEntities(row);
    if ((entities.agencies || []).length) stats.withAgency += 1;
    if ((entities.locations || []).length) stats.withLocation += 1;
    if ((entities.systems || []).length) stats.withSystem += 1;
    if ((entities.dates || []).length) stats.withDate += 1;
    if ((entities.people_roles || []).length) stats.withRole += 1;
    if (getKeywords(row).length) stats.withKeywords += 1;
    if (row.aiImpactClassification) stats.withTask2Impact += 1;
    if (Number.isFinite(Number(row.aiConfidenceScore))) stats.withTask2Confidence += 1;
    if (hasArrayItems(row.aiThemes)) stats.withTask3Themes += 1;
    if (['voice', 'audio'].includes(String(row.storyType || '').toLowerCase())) {
      stats.voiceCount += 1;
      if (row.transcriptionText) stats.voiceWithTranscript += 1;
    }

    const reasons = missingReasons(row);
    const task2To5Reasons = reasons.filter((reason) => reason !== 'task1_transcript');
    if (task2To5Reasons.length === 0) stats.completeTask2To5 += 1;
    else stats.missingAnyTask2To5 += 1;
    if (reasons.length === 0) stats.missingAnyTask += 1;
    else {
      for (const reason of reasons) missingByReason[reason] = (missingByReason[reason] || 0) + 1;
      incomplete.push({
        title: row.title,
        moderationStatus: row.moderationStatus,
        storyType: row.storyType,
        missing: reasons,
      });
    }
  }

  console.log(JSON.stringify({
    stats,
    missingByReason,
    incomplete: incomplete.slice(0, 30),
    sample: rows.slice(0, 5).map((row) => ({
      title: row.title,
      city: row.city,
      zipCode: row.zipCode,
      occurredAtText: row.occurredAtText,
      affectedDomain: row.affectedDomain,
      impact: row.aiImpactClassification,
      confidence: row.aiConfidenceScore,
      themes: (row.aiThemes || []).map((item) => item.theme),
      entities: getEntities(row),
      keywords: getKeywords(row),
      aiProcessedAt: row.aiProcessedAt,
    })),
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
