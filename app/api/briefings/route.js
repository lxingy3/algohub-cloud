import { NextResponse } from 'next/server';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

function enumValue(value, allowed) {
  const normalized = (value || '').trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : '';
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const jurisdictionId = getJurisdictionId();
  const algorithm = params.get('algorithm') || '';
  const dateFrom = dateValue(params.get('date_from'));
  const dateTo = dateValue(params.get('date_to'));
  const reviewStatus = enumValue(params.get('review_status'), ['DRAFT', 'REVIEWED', 'PUBLISHED']);
  const briefingType = enumValue(params.get('type'), ['ALGORITHM_SPECIFIC', 'THEMATIC', 'SILENCE_REPORT', 'CROSS_CUTTING']);
  const generatedBy = params.get('generated_by') || '';
  const targetTheme = params.get('target_theme') || '';
  const effectiveReviewStatus = reviewStatus || 'PUBLISHED';
  const includeBody = effectiveReviewStatus === 'PUBLISHED';
  const dateFilters = [
    ...(dateFrom ? [{ OR: [{ dateRangeEnd: null }, { dateRangeEnd: { gte: dateFrom } }] }] : []),
    ...(dateTo ? [{ OR: [{ dateRangeStart: null }, { dateRangeStart: { lte: dateTo } }] }] : []),
  ];
  const items = await prisma.briefing.findMany({
    where: {
      jurisdictionId,
      ...(algorithm ? { targetAlgorithm: { slug: algorithm } } : {}),
      ...(dateFilters.length ? { AND: dateFilters } : {}),
      reviewStatus: effectiveReviewStatus,
      ...(briefingType ? { briefingType } : {}),
      ...(generatedBy ? { generatedBy } : {}),
      ...(targetTheme ? { targetTheme } : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
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
      dateRangeStart: true,
      dateRangeEnd: true,
      ...(includeBody ? {
        executiveSummary: true,
        keyFindings: true,
        patternAnalysis: true,
        recommendations: true,
        claimVsExperience: true,
      } : {}),
      targetAlgorithm: { select: { slug: true, name: true, useCase: true, agencyName: true } },
    },
  });
  return NextResponse.json({ items, total: items.length });
}
