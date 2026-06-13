import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

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
          summary: cleanedTranscript.length > 160 ? `${cleanedTranscript.slice(0, 157)}...` : cleanedTranscript,
        } : {}),
      },
      select: {
        id: true,
        title: true,
        transcriptionStatus: true,
        transcriptionText: true,
        transcribedAt: true,
      },
    });

    return { job: updatedJob, testimony: updatedTestimony };
  });

  return NextResponse.json({
    ok: true,
    task: 'Task 1: audio transcription',
    provider,
    confidence,
    result,
  });
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
