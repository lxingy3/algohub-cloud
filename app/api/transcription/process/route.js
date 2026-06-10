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
    status: 'PIPELINE_NOT_CONFIGURED',
    message: 'OpenAI Whisper is disabled. Pending jobs are preserved for the future open-source Whisper/Llama/topic-modelling pipeline.',
    jobs,
  }, { status: 202 });
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
  const limit = Math.min(Math.max(Number(body.limit || 10), 1), 50);
  return pendingPipelineResponse(limit);
}
