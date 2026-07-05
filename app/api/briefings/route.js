import { NextResponse } from 'next/server';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

function enumValue(value, allowed) {
  const normalized = (value || '').trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : '';
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const jurisdictionId = getJurisdictionId();
  const reviewStatus = enumValue(params.get('review_status'), ['DRAFT', 'REVIEWED', 'PUBLISHED']);
  const briefingType = enumValue(params.get('type'), ['ALGORITHM_SPECIFIC', 'THEMATIC', 'SILENCE_REPORT', 'CROSS_CUTTING']);
  const generatedBy = params.get('generated_by') || '';
  const targetTheme = params.get('target_theme') || '';
  const items = await prisma.briefing.findMany({
    where: {
      jurisdictionId,
      ...(reviewStatus ? { reviewStatus } : {}),
      ...(briefingType ? { briefingType } : {}),
      ...(generatedBy ? { generatedBy } : {}),
      ...(targetTheme ? { targetTheme } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      briefingType: true,
      targetTheme: true,
      testimonyCount: true,
      reviewStatus: true,
      publishedAt: true,
      generatedBy: true,
    },
  });
  return NextResponse.json({ items, total: items.length });
}
