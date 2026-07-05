import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus } from '../../../../lib/briefingsExplore';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const rows = await getApprovedBriefingCorpus({
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
  });
  const topics = await prisma.corpusTopic.findMany({ orderBy: { topicId: 'asc' } });

  return NextResponse.json({
    label: 'suggested corpus patterns',
    total: rows.length,
    topics,
    points: rows.filter((row) => row.umapX !== null && row.umapY !== null).map((row) => ({
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
  });
}

