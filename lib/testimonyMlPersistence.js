import { createHash } from 'node:crypto';
import {
  ALGORITHM_MATCH_METHOD,
  ALGORITHM_MATCH_THRESHOLD,
  ALGORITHM_MATCH_VERSION,
} from './algorithmMatcher.js';
import { ML_PIPELINE_VERSION } from './mlPipelineContract.js';

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

export function isMissingTask2To5(testimony) {
  const entities = testimony.aiExtractedExperiences?.entities || {};
  const keywords = testimony.aiExtractedExperiences?.keywords || [];
  return (
    !testimony.aiImpactClassification
    || testimony.aiConfidenceScore === null
    || testimony.aiConfidenceScore === undefined
    || !Number.isFinite(Number(testimony.aiConfidenceScore))
    || !Array.isArray(testimony.aiThemes)
    || entityGroups.some((group) => !Array.isArray(entities[group]))
    || !Array.isArray(keywords)
    || testimony.aiExtractedExperiences?.modelProvenance?.pipelineVersion !== ML_PIPELINE_VERSION
  );
}

export function isStoredAlgorithmMatchComplete(testimony, expectedCatalogVersion = '') {
  const stored = testimony.aiExtractedExperiences?.algorithmMatching;
  return (
    stored?.status === 'COMPLETED'
    && stored.method === ALGORITHM_MATCH_METHOD
    && stored.version === ALGORITHM_MATCH_VERSION
    && Number(stored.threshold) === ALGORITHM_MATCH_THRESHOLD
    && (!expectedCatalogVersion || stored.catalogVersion === expectedCatalogVersion)
  );
}

export function storedAnalysisResult(testimony) {
  const experiences = isRecord(testimony.aiExtractedExperiences) ? testimony.aiExtractedExperiences : {};
  const provenance = isRecord(experiences.modelProvenance) ? experiences.modelProvenance : {};
  return {
    status: 'COMPLETED',
    task2: {
      status: 'COMPLETED',
      aiImpactClassification: testimony.aiImpactClassification,
      aiConfidenceScore: testimony.aiConfidenceScore,
      ...(isRecord(provenance.task2) ? provenance.task2 : {}),
    },
    task3: {
      status: 'COMPLETED',
      aiThemes: normalizeThemes(testimony.aiThemes),
      ...(isRecord(provenance.task3) ? provenance.task3 : {}),
    },
    task4: {
      status: 'COMPLETED',
      entities: normalizeEntities(experiences.entities),
      ...(isRecord(provenance.task4) ? provenance.task4 : {}),
    },
    task5: {
      status: 'COMPLETED',
      keywords: normalizeStringArray(experiences.keywords),
      ...(isRecord(provenance.task5) ? provenance.task5 : {}),
    },
  };
}

export function buildTestimonyMlUpdate(testimony, result, algorithmMatching) {
  const priorExperiences = isRecord(testimony.aiExtractedExperiences) ? testimony.aiExtractedExperiences : {};
  const priorEntities = isRecord(priorExperiences.entities) ? priorExperiences.entities : {};
  const nextEntities = result.task4?.status === 'COMPLETED'
    ? normalizeEntities(result.task4.entities)
    : priorEntities;
  const nextKeywords = result.task5?.status === 'COMPLETED'
    ? normalizeStringArray(result.task5.keywords)
    : Array.isArray(priorExperiences.keywords) ? priorExperiences.keywords : [];
  const processedAt = new Date();
  const modelProvenance = buildModelProvenance(testimony, result, processedAt);

  return {
    aiImpactClassification: result.task2?.status === 'COMPLETED'
      ? result.task2.aiImpactClassification
      : testimony.aiImpactClassification,
    aiConfidenceScore: result.task2?.status === 'COMPLETED'
      ? Number(result.task2.aiConfidenceScore || 0)
      : testimony.aiConfidenceScore,
    aiThemes: result.task3?.status === 'COMPLETED'
      ? normalizeThemes(result.task3.aiThemes)
      : normalizeThemes(testimony.aiThemes),
    aiExtractedExperiences: {
      ...priorExperiences,
      entities: nextEntities,
      keywords: nextKeywords,
      modelProvenance,
      algorithmMatching,
    },
    aiLinkedAlgorithmIds: algorithmMatching.matches.map((match) => match.algorithmId),
    aiProcessedAt: processedAt,
  };
}

export async function persistTestimonyMlResult({ prisma, testimony, result, algorithmMatching }) {
  const update = buildTestimonyMlUpdate(testimony, result, algorithmMatching);
  await persistUpdateAndAlgorithmLinks({ prisma, testimony, update, algorithmMatching });
  return update;
}

export async function persistTestimonyAlgorithmMatch({ prisma, testimony, algorithmMatching }) {
  const priorExperiences = isRecord(testimony.aiExtractedExperiences) ? testimony.aiExtractedExperiences : {};
  const update = {
    aiExtractedExperiences: {
      ...priorExperiences,
      algorithmMatching,
    },
    aiLinkedAlgorithmIds: algorithmMatching.matches.map((match) => match.algorithmId),
  };
  await persistUpdateAndAlgorithmLinks({ prisma, testimony, update, algorithmMatching });
  return update;
}

async function persistUpdateAndAlgorithmLinks({ prisma, testimony, update, algorithmMatching }) {
  const humanAlgorithmIds = new Set(
    (testimony.algorithmLinks || [])
      .filter((link) => link.linkType !== 'AI_DETECTED')
      .map((link) => link.algorithmId),
  );
  const aiRows = algorithmMatching.matches
    .filter((match) => !humanAlgorithmIds.has(match.algorithmId))
    .map((match) => ({
      testimonyId: testimony.id,
      algorithmId: match.algorithmId,
      linkType: 'AI_DETECTED',
      confidence: match.confidence,
    }));

  const operations = [
    prisma.testimony.update({ where: { id: testimony.id }, data: update }),
    prisma.testimonyAlgorithmLink.deleteMany({
      where: { testimonyId: testimony.id, linkType: 'AI_DETECTED' },
    }),
  ];
  if (aiRows.length) {
    operations.push(prisma.testimonyAlgorithmLink.createMany({ data: aiRows, skipDuplicates: true }));
  }
  await prisma.$transaction(operations);
}

export function getSkippedTasks(result) {
  return ['task2', 'task3', 'task4', 'task5']
    .filter((key) => result[key]?.status !== 'COMPLETED')
    .map((key) => ({ task: key, error: result[key]?.error || 'not completed' }));
}

export function normalizeThemes(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeEntities(value) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(entityGroups.map((group) => [group, normalizeStringArray(source[group])]));
}

export function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];
}

function buildModelProvenance(testimony, result, processedAt) {
  const sourceText = String(testimony.transcriptionText || testimony.narrativeText || '').trim();
  const task2 = provenanceFields(result.task2, [
    'model', 'runtime', 'calibration', 'decisionSource', 'confidenceKind',
    'decisionEvidence', 'rawModelPrediction', 'rawModelConfidence', 'rawModelScores', 'fallbackReason',
  ]);
  const task3 = provenanceFields(result.task3, [
    'model', 'runtime', 'calibration', 'rawModelScores', 'fallbackReason',
  ]);
  const task4 = provenanceFields(result.task4, ['model', 'runtime', 'fallbackReason']);
  const task5 = provenanceFields(result.task5, ['model', 'runtime', 'fallbackReason']);
  const runtimes = [task2.runtime, task3.runtime, task4.runtime, task5.runtime].filter(Boolean);

  return {
    pipelineVersion: ML_PIPELINE_VERSION,
    generatedAt: processedAt.toISOString(),
    runtime: [...new Set(runtimes)].join(' + ') || 'unknown',
    inputSource: testimony.transcriptionText ? 'transcriptionText' : 'narrativeText',
    sourceContentHash: createHash('sha256').update(sourceText).digest('hex'),
    sourceCharacters: sourceText.length,
    truncated: sourceText.length > 12000,
    task2,
    task3,
    task4,
    task5,
  };
}

function provenanceFields(task, fields) {
  const source = isRecord(task) ? task : {};
  return Object.fromEntries(fields
    .filter((field) => source[field] !== undefined && source[field] !== null)
    .map((field) => [field, source[field]]));
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
