import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

async function isAuthorized(request) {
  const configuredSecret = process.env.ML_PROCESS_SECRET;
  const requestSecret = request.headers.get('x-ml-process-secret');
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (configuredSecret && requestSecret === configuredSecret) return true;
  return Boolean(await requireAdmin());
}

async function pendingPipelineResponse(limit = 10) {
  const jurisdictionId = getJurisdictionId();
  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId,
      OR: [
        { aiThemes: null },
        { aiExtractedExperiences: null },
      ],
      narrativeText: { not: '' },
    },
    orderBy: { submittedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      title: true,
      narrativeText: true,
      transcriptionText: true,
      storyType: true,
      submittedAt: true,
    },
  });

  return NextResponse.json({
    status: 'READY_FOR_TASK345_WORKER',
    task: 'Task 3-5: theme, entity, and keyword extraction',
    inputField: 'narrativeText',
    outputFields: ['aiThemes', 'aiExtractedExperiences.entities', 'aiExtractedExperiences.keywords'],
    testimonies,
  }, { status: 202 });
}

async function completeInsights({ testimonyId, themes, entities, keywords }) {
  if (!testimonyId) return NextResponse.json({ error: 'testimonyId is required.' }, { status: 400 });
  const normalizedThemes = Array.isArray(themes) ? themes : [];
  const normalizedEntities = entities && typeof entities === 'object' && !Array.isArray(entities) ? entities : {};
  const normalizedKeywords = Array.isArray(keywords) ? keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 10) : [];

  const updated = await prisma.testimony.updateMany({
    where: {
      id: testimonyId,
      jurisdictionId: getJurisdictionId(),
    },
    data: {
      aiThemes: normalizedThemes,
      aiExtractedExperiences: {
        entities: normalizedEntities,
        keywords: normalizedKeywords,
      },
      aiProcessedAt: new Date(),
    },
  });

  if (!updated.count) return NextResponse.json({ error: 'Testimony was not found.' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    task: 'Task 3-5: theme, entity, and keyword extraction',
    result: {
      testimonyId,
      aiThemes: normalizedThemes,
      aiExtractedExperiences: {
        entities: normalizedEntities,
        keywords: normalizedKeywords,
      },
    },
  });
}

export async function GET(request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Cron access is required.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50);
  return pendingPipelineResponse(limit);
}

export async function POST(request) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === 'complete') {
    return completeInsights(body);
  }

  const limit = Math.min(Math.max(Number(body.limit || 10), 1), 50);
  return pendingPipelineResponse(limit);
}
