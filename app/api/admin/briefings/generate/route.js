import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { prisma } from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const formData = await request.formData();
  const briefingType = formData.get('briefingType') === 'ALGORITHM_SPECIFIC' ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING';
  const requestedAlgorithmId = String(formData.get('targetAlgorithmId') || '');
  const jurisdictionId = getJurisdictionId();
  const targetAlgorithm = briefingType === 'ALGORITHM_SPECIFIC'
    ? await prisma.algorithm.findFirst({ where: { id: requestedAlgorithmId, jurisdictionId }, select: { id: true } })
    : null;
  if (briefingType === 'ALGORITHM_SPECIFIC' && !targetAlgorithm) {
    return NextResponse.json({ error: 'Choose a valid algorithm.' }, { status: 400 });
  }
  const targetAlgorithmId = targetAlgorithm?.id || null;
  const existing = await prisma.briefingGenerationJob.findFirst({
    where: { jurisdictionId, briefingType, targetAlgorithmId, status: { in: ['PENDING', 'RUNNING'] } },
    orderBy: { createdAt: 'desc' },
  });
  const job = existing || await prisma.briefingGenerationJob.create({
    data: {
      jurisdictionId,
      requestedByUserId: admin.id,
      briefingType,
      targetAlgorithmId,
      message: 'Waiting for the local or Google Cloud briefing worker.',
    },
  });
  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({ job, duplicate: Boolean(existing) }, { status: existing ? 200 : 202 });
  }
  return NextResponse.redirect(new URL('/admin/briefings?generation=queued', request.url), { status: 303 });
}
