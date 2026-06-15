import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const inputPath = process.argv[2] || 'task2-results/task2-production-impact-results.json';

async function main() {
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const results = Array.isArray(payload.results) ? payload.results : [];
  let updated = 0;

  for (const result of results) {
    const testimonyId = String(result.id || '').trim();
    const classification = String(result.aiImpactClassification || '').trim().toUpperCase();
    const confidence = Number(result.aiConfidenceScore);
    if (!testimonyId || !classification || !Number.isFinite(confidence)) continue;

    await prisma.testimony.update({
      where: { id: testimonyId },
      data: {
        aiImpactClassification: classification,
        aiConfidenceScore: confidence,
        aiProcessedAt: new Date(),
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ inputPath, results: results.length, updated }));
}

main().finally(async () => {
  await prisma.$disconnect();
});
