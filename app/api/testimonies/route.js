import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const testimonySchema = z.object({
  title: z.string().trim().min(1),
  city: z.string().trim().optional(),
  narrativeText: z.string().trim().min(1),
  algorithmId: z.string().trim().optional(),
  selfReportedImpact: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
  const jurisdictionId = getJurisdictionId();
  const domain = searchParams.get('domain') || '';
  const impact = searchParams.get('impact') || '';
  const algorithmId = searchParams.get('algorithm') || '';

  const where = {
    jurisdictionId,
    moderationStatus: 'APPROVED',
    ...(domain ? { affectedDomain: domain } : {}),
    ...(impact ? { selfReportedImpact: impact } : {}),
    ...(algorithmId ? { algorithmLinks: { some: { algorithmId } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        algorithmLinks: { include: { algorithm: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.testimony.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const formData = await request.formData();
  const jurisdictionId = getJurisdictionId();
  const result = testimonySchema.safeParse({
    title: formData.get('title'),
    city: formData.get('city'),
    narrativeText: formData.get('narrativeText'),
    algorithmId: formData.get('algorithmId'),
    selfReportedImpact: formData.get('selfReportedImpact') || 'UNCLEAR',
    idempotencyKey: formData.get('idempotencyKey') || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid testimony submission' }, { status: 400 });
  }

  const { title, city, narrativeText, algorithmId, selfReportedImpact, idempotencyKey } = result.data;
  const sourceId = idempotencyKey ? `submission:${jurisdictionId}:${idempotencyKey}` : null;
  const testimonyData = {
    sourceId,
    jurisdictionId,
    title,
    city: city || '',
    narrativeText,
    summary: narrativeText.length > 160 ? `${narrativeText.slice(0, 157)}...` : narrativeText,
    userId: user?.id,
    submitterName: user?.name,
    submitterEmail: user?.email,
    isAnonymous: !user,
    submissionMethod: 'WEB_FORM',
    selfReportedImpact,
    moderationStatus: 'PENDING',
  };

  const testimony = await createIdempotentTestimony(sourceId, testimonyData);

  if (algorithmId) {
    await prisma.testimonyAlgorithmLink.upsert({
      where: {
        testimonyId_algorithmId: {
          testimonyId: testimony.id,
          algorithmId,
        },
      },
      update: {},
      create: {
        testimonyId: testimony.id,
        algorithmId,
        linkType: 'SUBMITTER_IDENTIFIED',
        confidence: 1,
      },
    });
  }

  return NextResponse.redirect(new URL(user ? '/my-stories' : '/stories', request.url), { status: 303 });
}

async function createIdempotentTestimony(sourceId, testimonyData) {
  if (!sourceId) {
    return prisma.testimony.create({ data: testimonyData });
  }

  const existing = await prisma.testimony.findUnique({ where: { sourceId } });
  if (existing) return existing;

  try {
    return await prisma.testimony.create({ data: testimonyData });
  } catch (error) {
    if (error?.code === 'P2002') {
      const duplicate = await prisma.testimony.findUnique({ where: { sourceId } });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}
