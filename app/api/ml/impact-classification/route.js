import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

const labels = new Set(['NEGATIVE', 'POSITIVE', 'MIXED', 'UNCLEAR']);

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
      aiImpactClassification: null,
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
    status: 'READY_FOR_TASK2_WORKER',
    task: 'Task 2: impact classification',
    inputField: 'narrativeText',
    outputFields: ['aiImpactClassification', 'aiConfidenceScore'],
    labels: [...labels],
    testimonies,
  }, { status: 202 });
}

async function completeClassification({ testimonyId, classification, confidence }) {
  const normalizedClassification = String(classification || '').trim().toUpperCase();
  const numericConfidence = Number(confidence);
  if (!testimonyId) return NextResponse.json({ error: 'testimonyId is required.' }, { status: 400 });
  if (!labels.has(normalizedClassification)) {
    return NextResponse.json({ error: 'classification must be NEGATIVE, POSITIVE, MIXED, or UNCLEAR.' }, { status: 400 });
  }
  if (!Number.isFinite(numericConfidence) || numericConfidence < 0 || numericConfidence > 1) {
    return NextResponse.json({ error: 'confidence must be a number between 0 and 1.' }, { status: 400 });
  }

  const updated = await prisma.testimony.updateMany({
    where: {
      id: testimonyId,
      jurisdictionId: getJurisdictionId(),
    },
    data: {
      aiImpactClassification: normalizedClassification,
      aiConfidenceScore: numericConfidence,
    },
  });

  if (!updated.count) return NextResponse.json({ error: 'Testimony was not found.' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    task: 'Task 2: impact classification',
    result: {
      testimonyId,
      aiImpactClassification: normalizedClassification,
      aiConfidenceScore: numericConfidence,
      humanReviewRequired: numericConfidence < 0.85,
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
    return completeClassification(body);
  }

  const limit = Math.min(Math.max(Number(body.limit || 10), 1), 50);
  return pendingPipelineResponse(limit);
}
