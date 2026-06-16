import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
    },
  });

  const stats = {
    count: rows.length,
    withAgency: 0,
    withLocation: 0,
    withSystem: 0,
    withDate: 0,
    withRole: 0,
    withKeywords: 0,
  };

  for (const row of rows) {
    const entities = row.aiExtractedExperiences?.entities || {};
    if ((entities.agencies || []).length) stats.withAgency += 1;
    if ((entities.locations || []).length) stats.withLocation += 1;
    if ((entities.systems || []).length) stats.withSystem += 1;
    if ((entities.dates || []).length) stats.withDate += 1;
    if ((entities.people_roles || []).length) stats.withRole += 1;
    if ((row.aiExtractedExperiences?.keywords || []).length) stats.withKeywords += 1;
  }

  console.log(JSON.stringify({
    stats,
    sample: rows.slice(0, 5).map((row) => ({
      title: row.title,
      city: row.city,
      zipCode: row.zipCode,
      occurredAtText: row.occurredAtText,
      affectedDomain: row.affectedDomain,
      impact: row.aiImpactClassification,
      confidence: row.aiConfidenceScore,
      themes: (row.aiThemes || []).map((item) => item.theme),
      entities: row.aiExtractedExperiences?.entities,
      keywords: row.aiExtractedExperiences?.keywords,
    })),
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
