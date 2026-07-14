import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { matchAlgorithms } from '../lib/algorithmMatcher.js';

for (const file of ['.env.production.local', '.env.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

async function main() {
  const [algorithms, fixtures] = await Promise.all([
    prisma.algorithm.findMany({ where: { jurisdictionId } }),
    prisma.testimony.findMany({
      where: { jurisdictionId, sourceId: { startsWith: 'synthetic-briefings-v1-' } },
      select: {
        sourceId: true,
        title: true,
        narrativeText: true,
        affectedDomain: true,
        aiExtractedExperiences: true,
        algorithmLinks: {
          where: { linkType: 'FACILITATOR_TAGGED' },
          select: { algorithmId: true },
        },
      },
    }),
  ]);
  assert.equal(fixtures.length, 16, 'Expected 16 reviewed synthetic matcher fixtures.');
  const results = fixtures.map((fixture) => {
    const matches = matchAlgorithms({
      narrativeText: fixture.narrativeText,
      title: fixture.title,
      affectedDomain: fixture.affectedDomain,
      entities: fixture.aiExtractedExperiences?.entities || {},
      keywords: fixture.aiExtractedExperiences?.keywords || [],
      algorithms,
    });
    return {
      sourceId: fixture.sourceId,
      expectedId: fixture.algorithmLinks[0]?.algorithmId,
      actualId: matches[0]?.algorithmId || null,
      score: matches[0]?.confidence || null,
    };
  });
  const correct = results.filter((row) => row.expectedId === row.actualId).length;
  assert.equal(correct, fixtures.length, `Expected every reviewed fixture to rank its tagged algorithm first: ${JSON.stringify(results)}`);
  console.log(JSON.stringify({ status: 'PASS', fixtures: fixtures.length, top1: correct }, null, 2));
}

main().finally(async () => prisma.$disconnect());
