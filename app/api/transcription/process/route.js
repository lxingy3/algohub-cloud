import OpenAI, { toFile } from 'openai';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { hasR2Config, readMediaObject } from '../../../../lib/r2';

export const dynamic = 'force-dynamic';

function summarize(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

async function isAuthorized(request) {
  const configuredSecret = process.env.TRANSCRIPTION_PROCESS_SECRET;
  const requestSecret = request.headers.get('x-transcription-secret');
  if (configuredSecret && requestSecret === configuredSecret) return true;
  return Boolean(await requireAdmin());
}

export async function POST(request) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 503 });
  }
  if (!hasR2Config()) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit || 1), 1), 5);
  const jurisdictionId = getJurisdictionId();
  const jobs = await prisma.transcriptionJob.findMany({
    where: {
      jurisdictionId,
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const processed = [];

  for (const job of jobs) {
    await prisma.transcriptionJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, error: null },
    });

    try {
      const media = await readMediaObject(job.objectKey);
      const fileName = `${job.mediaKind}-${job.id}.${media.contentType.includes('mp4') ? 'mp4' : 'webm'}`;
      const transcript = await client.audio.transcriptions.create({
        model: 'whisper-1',
        file: await toFile(media.buffer, fileName, { type: media.contentType }),
      });
      const text = String(transcript.text || '').trim();

      await prisma.$transaction([
        prisma.transcriptionJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            transcript: text,
            processedAt: new Date(),
          },
        }),
        prisma.testimony.update({
          where: { id: job.testimonyId },
          data: {
            transcriptionStatus: 'COMPLETED',
            transcriptionText: text,
            transcriptionError: null,
            transcribedAt: new Date(),
            narrativeText: text || undefined,
            summary: text ? summarize(text) : undefined,
          },
        }),
      ]);

      processed.push({ id: job.id, status: 'COMPLETED' });
    } catch (error) {
      const message = error?.message || 'Transcription failed.';
      await prisma.$transaction([
        prisma.transcriptionJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: message },
        }),
        prisma.testimony.update({
          where: { id: job.testimonyId },
          data: { transcriptionStatus: 'FAILED', transcriptionError: message },
        }),
      ]);
      processed.push({ id: job.id, status: 'FAILED', error: message });
    }
  }

  return NextResponse.json({ processed });
}
