import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const topicIds = [...new Set(rows.map((row) => row.topicId).filter((topicId) => topicId !== null))];
  const topics = topicIds.length
    ? await prisma.corpusTopic.findMany({ where: { topicId: { in: topicIds } }, orderBy: { topicId: 'asc' } })
    : [];

  return NextResponse.json({
    label: 'suggested corpus patterns',
    total: rows.length,
    topics,
    points: filters.lens === 'government' ? [] : rows.filter((row) => row.umapX !== null && row.umapY !== null).map((row) => ({
      id: row.id,
      title: row.title,
      topicId: row.topicId,
      topicLabel: row.corpusTopic?.label || null,
      clusterId: row.clusterId,
      isOutlier: row.isOutlier,
      umapX: row.umapX,
      umapY: row.umapY,
      excerpt: anonymizedExcerpt(row),
    })),
    notes: filters.lens === 'government' ? ['Government lens is aggregate-only; story-level map points are not returned.'] : [],
  });
}
