import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getCurrentUser } from '../../../lib/auth';
import { getJurisdictionId } from '../../../lib/jurisdiction';

function cleanPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const safePayload = { ...payload };
  delete safePayload.mediaObjectKey;
  delete safePayload.mediaUrl;
  delete safePayload.mediaMimeType;
  delete safePayload.mediaDurationSeconds;
  return safePayload;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ payload: null }, { status: 401 });

  const draft = await prisma.submissionDraft.findUnique({
    where: {
      jurisdictionId_userId: {
        jurisdictionId: getJurisdictionId(),
        userId: user.id,
      },
    },
    select: { payload: true, updatedAt: true },
  });

  return NextResponse.json({ payload: draft?.payload || null, updatedAt: draft?.updatedAt || null });
}

export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const payload = cleanPayload(body?.payload);
  const jurisdictionId = getJurisdictionId();

  await prisma.submissionDraft.upsert({
    where: {
      jurisdictionId_userId: {
        jurisdictionId,
        userId: user.id,
      },
    },
    update: { payload },
    create: {
      jurisdictionId,
      userId: user.id,
      payload,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true });

  await prisma.submissionDraft.deleteMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
