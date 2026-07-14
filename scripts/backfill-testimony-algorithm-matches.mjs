import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  buildAlgorithmMatchResultFromAnalysis,
  loadAlgorithmMatchCatalog,
} from '../lib/algorithmMatcher.js';
import {
  getSkippedTasks,
  isMissingTask2To5,
  persistTestimonyAlgorithmMatch,
  persistTestimonyMlResult,
  storedAnalysisResult,
} from '../lib/testimonyMlPersistence.js';
import { prepareMlAnalysisInput, selectTestimonyAnalysisText } from '../lib/mlAnalysisInput.js';

for (const file of ['.env.production.local', '.env.local', '.env.ml-run.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const refreshAllTask2To5 = process.argv.includes('--refresh-task2-5');
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
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const [algorithms, testimonies] = await Promise.all([
    loadAlgorithmMatchCatalog(prisma, jurisdictionId),
    prisma.testimony.findMany({
      where: { jurisdictionId },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        narrativeText: true,
        transcriptionText: true,
        affectedDomain: true,
        aiImpactClassification: true,
        aiConfidenceScore: true,
        aiThemes: true,
        aiExtractedExperiences: true,
        algorithmLinks: {
          select: {
            algorithmId: true,
            linkType: true,
            algorithm: { select: { useCase: true } },
          },
        },
      },
    }),
  ]);

  const results = [];
  let analyzeNarrativeTextWithModels = async () => {
    throw new Error('Task 2-5 analyzer was not initialized.');
  };
  if (apply && (refreshAllTask2To5 || testimonies.some(isMissingTask2To5))) {
    process.env.TASK25_DISABLE_LOCAL_RUNNER = 'true';
    ({ analyzeNarrativeTextWithModels } = await import('../lib/mlFullAnalysis.js'));
  }
  for (const testimony of testimonies) {
    const task2To5Missing = isMissingTask2To5(testimony);
    const refreshTask2To5 = apply && (refreshAllTask2To5 || task2To5Missing);
    const sourceText = selectTestimonyAnalysisText(testimony);
    const analysisInput = await prepareMlAnalysisInput(sourceText);
    const analysis = refreshTask2To5
      ? await analyzeNarrativeTextWithModels(analysisInput.text)
      : storedAnalysisResult(testimony);
    if (refreshTask2To5) {
      const skippedTasks = getSkippedTasks(analysis);
      if (skippedTasks.length) {
        throw new Error(`Task 2-5 refresh failed for ${testimony.id}: ${JSON.stringify(skippedTasks)}`);
      }
    }
    const affectedDomain = testimony.affectedDomain
      || testimony.algorithmLinks.find((link) => link.linkType !== 'AI_DETECTED')?.algorithm?.useCase
      || '';
    const algorithmMatching = buildAlgorithmMatchResultFromAnalysis({
      analysis,
      narrativeText: analysisInput.text,
      title: testimony.title,
      affectedDomain,
      algorithms,
    });
    if (apply) {
      if (refreshTask2To5) {
        await persistTestimonyMlResult({ prisma, testimony, result: analysis, algorithmMatching });
      } else {
        await persistTestimonyAlgorithmMatch({ prisma, testimony, algorithmMatching });
      }
    }
    results.push({
      id: testimony.id,
      affectedDomain: affectedDomain || null,
      match: algorithmMatching.matches[0] || null,
      refreshedTask2To5: refreshTask2To5,
      task2To5Missing,
      preservedHumanLinks: testimony.algorithmLinks.filter((link) => link.linkType !== 'AI_DETECTED').length,
    });
  }

  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    jurisdictionId,
    testimonies: results.length,
    matched: results.filter((row) => row.match).length,
    unmatched: results.filter((row) => !row.match).length,
    withDomain: results.filter((row) => row.affectedDomain).length,
    task2To5Missing: results.filter((row) => row.task2To5Missing).length,
    refreshedTask2To5: results.filter((row) => row.refreshedTask2To5).length,
    refreshAllTask2To5,
    preservedHumanLinks: results.reduce((sum, row) => sum + row.preservedHumanLinks, 0),
  }, null, 2));
}

main().finally(async () => prisma.$disconnect());
