import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { analyzeNarrativeTextWithModels } from '../../../../lib/mlFullAnalysis';
import { prisma } from '../../../../lib/prisma';
import { buildStorySummary } from '../../../../lib/storySummary';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

async function isAuthorized(request) {
  const configuredSecret = process.env.TRANSCRIPTION_PROCESS_SECRET;
  const requestSecret = request.headers.get('x-transcription-secret');
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (configuredSecret && requestSecret === configuredSecret) return true;
  return Boolean(await requireAdmin());
}

async function pendingPipelineResponse(limit = 10) {
  const jurisdictionId = getJurisdictionId();
  const jobs = await prisma.transcriptionJob.findMany({
    where: {
      jurisdictionId,
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      testimonyId: true,
      mediaKind: true,
      objectKey: true,
      storageProvider: true,
      mimeType: true,
      status: true,
      provider: true,
      attempts: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    status: 'READY_FOR_TASK1_WORKER',
    message: 'Task 1 audio transcription jobs are ready. An external open-source Whisper worker can pull these jobs and post completed transcripts back to this endpoint.',
    jobs,
  }, { status: 202 });
}

async function completeTranscription({ jobId, testimonyId, transcript, provider = 'open-source-whisper', confidence = null }) {
  const cleanedTranscript = String(transcript || '').trim();
  if (!cleanedTranscript) {
    return NextResponse.json({ error: 'Transcript text is required.' }, { status: 400 });
  }

  const jurisdictionId = getJurisdictionId();
  const job = jobId
    ? await prisma.transcriptionJob.findFirst({ where: { id: jobId, jurisdictionId } })
    : await prisma.transcriptionJob.findFirst({
      where: { testimonyId, jurisdictionId },
      orderBy: { createdAt: 'desc' },
    });

  if (!job) {
    return NextResponse.json({ error: 'Transcription job was not found.' }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedJob = await tx.transcriptionJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        provider,
        transcript: cleanedTranscript,
        error: null,
        attempts: { increment: 1 },
        processedAt: new Date(),
      },
    });

    const existing = await tx.testimony.findUnique({
      where: { id: job.testimonyId },
      select: { narrativeText: true },
    });
    const placeholderNarrative = existing?.narrativeText?.startsWith('A voice story was submitted');
    const updatedTestimony = await tx.testimony.update({
      where: { id: job.testimonyId },
      data: {
        transcriptionStatus: 'COMPLETED',
        transcriptionText: cleanedTranscript,
        transcriptionError: null,
        transcribedAt: new Date(),
        ...(placeholderNarrative ? {
          narrativeText: cleanedTranscript,
          summary: buildStorySummary(cleanedTranscript),
        } : {}),
      },
      select: {
        id: true,
        title: true,
        transcriptionStatus: true,
        transcriptionText: true,
        transcribedAt: true,
        affectedDomain: true,
      },
    });

    return { job: updatedJob, testimony: updatedTestimony };
  });

  const task2To7 = await storeTask2To7ForTestimony(result.testimony.id, cleanedTranscript);

  return NextResponse.json({
    ok: true,
    task: 'Task 1: audio transcription',
    provider,
    confidence,
    task2To7,
    result,
  });
}

async function storeTask2To7ForTestimony(testimonyId, text) {
  try {
    const jurisdictionId = getJurisdictionId();
    const testimony = await prisma.testimony.findUnique({
      where: { id: testimonyId },
      select: {
        summary: true,
        affectedDomain: true,
        aiImpactClassification: true,
        aiConfidenceScore: true,
        aiThemes: true,
        aiExtractedExperiences: true,
        aiLinkedAlgorithmIds: true,
      },
    });
    if (!testimony) {
      return { status: 'SKIPPED', reason: 'testimony_not_found' };
    }

    const algorithms = await loadAlgorithmCandidates(jurisdictionId);
    const result = await analyzeNarrativeTextWithModels(text, {
      algorithms,
      affectedDomain: testimony.affectedDomain,
    });
    const update = buildMlUpdate(testimony, result);
    await prisma.$transaction(async (tx) => {
      await tx.testimony.update({
        where: { id: testimonyId },
        data: update,
      });
      await replaceAiDetectedAlgorithmLinks(tx, testimonyId, result.task6);
    });

    return {
      status: result.status,
      updatedFields: Object.keys(update),
      skippedTasks: getSkippedTasks(result),
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error?.message || String(error),
    };
  }
}

function buildMlUpdate(testimony, result) {
  const priorExperiences = testimony.aiExtractedExperiences && typeof testimony.aiExtractedExperiences === 'object'
    ? testimony.aiExtractedExperiences
    : {};
  const priorEntities = priorExperiences.entities && typeof priorExperiences.entities === 'object'
    ? priorExperiences.entities
    : {};

  const nextEntities = result.task4?.status === 'COMPLETED'
    ? normalizeEntities(result.task4.entities)
    : normalizeEntities(priorEntities);
  const nextKeywords = result.task5?.status === 'COMPLETED'
    ? normalizeStringArray(result.task5.keywords)
    : normalizeStringArray(priorExperiences.keywords);

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
      entities: nextEntities,
      keywords: nextKeywords,
    },
    aiLinkedAlgorithmIds: result.task6?.status === 'COMPLETED'
      ? normalizeAlgorithmIds(result.task6.linkedAlgorithms)
      : normalizeStringArray(testimony.aiLinkedAlgorithmIds),
    summary: result.task7?.status === 'COMPLETED' && result.task7.summary
      ? result.task7.summary
      : testimony.summary,
    aiProcessedAt: new Date(),
  };
}

async function replaceAiDetectedAlgorithmLinks(tx, testimonyId, task6) {
  if (task6?.status !== 'COMPLETED') return;
  const links = normalizeAlgorithmLinks(task6.linkedAlgorithms);
  await tx.testimonyAlgorithmLink.deleteMany({
    where: {
      testimonyId,
      linkType: 'AI_DETECTED',
    },
  });
  if (!links.length) return;
  await tx.testimonyAlgorithmLink.createMany({
    data: links.map((link) => ({
      testimonyId,
      algorithmId: link.algorithmId,
      linkType: 'AI_DETECTED',
      confidence: link.confidence,
    })),
    skipDuplicates: true,
  });
}

async function loadAlgorithmCandidates(jurisdictionId) {
  return prisma.algorithm.findMany({
    where: { jurisdictionId },
    select: {
      id: true,
      name: true,
      useCase: true,
      description: true,
      purpose: true,
      agencyName: true,
      dataUsed: true,
      decisionType: true,
    },
  });
}

function normalizeAlgorithmIds(value) {
  return normalizeAlgorithmLinks(value).map((link) => link.algorithmId);
}

function normalizeAlgorithmLinks(value) {
  return Array.isArray(value)
    ? value
        .map((link) => ({
          algorithmId: String(link?.algorithmId || '').trim(),
          confidence: Number(link?.confidence || 0),
        }))
        .filter((link) => link.algorithmId)
    : [];
}

function normalizeThemes(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEntities(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(entityGroups.map((group) => [group, normalizeStringArray(source[group])]));
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];
}

function getSkippedTasks(result) {
  return ['task2', 'task3', 'task4', 'task5', 'task6', 'task7']
    .filter((key) => result[key]?.status !== 'COMPLETED')
    .map((key) => ({ task: key, error: result[key]?.error || 'not completed' }));
}

async function failTranscription({ jobId, testimonyId, error, provider = 'open-source-whisper' }) {
  const jurisdictionId = getJurisdictionId();
  const job = jobId
    ? await prisma.transcriptionJob.findFirst({ where: { id: jobId, jurisdictionId } })
    : await prisma.transcriptionJob.findFirst({
      where: { testimonyId, jurisdictionId },
      orderBy: { createdAt: 'desc' },
    });

  if (!job) {
    return NextResponse.json({ error: 'Transcription job was not found.' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.transcriptionJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        provider,
        error: String(error || 'Transcription failed.').slice(0, 1000),
        attempts: { increment: 1 },
        processedAt: new Date(),
      },
    }),
    prisma.testimony.update({
      where: { id: job.testimonyId },
      data: {
        transcriptionStatus: 'FAILED',
        transcriptionError: String(error || 'Transcription failed.').slice(0, 1000),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, task: 'Task 1: audio transcription', status: 'FAILED' });
}

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Cron access is required.' }, { status: 401 });
  }

  return pendingPipelineResponse(10);
}

export async function POST(request) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === 'complete') {
    return completeTranscription(body);
  }
  if (body.action === 'fail') {
    return failTranscription(body);
  }

  const limit = Math.min(Math.max(Number(body.limit || 10), 1), 50);
  return pendingPipelineResponse(limit);
}
