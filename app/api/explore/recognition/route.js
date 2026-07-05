import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, normalizeThemes, parseExploreFilters, storyTitle } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const theme = filters.theme;
  const matched = theme
    ? rows.filter((row) => normalizeThemes(row.aiThemes).some((item) => item.theme === theme))
    : rows.filter((row) => row.topicId !== null || row.clusterId !== null);
  const sorted = matched.sort((a, b) => Number(b.isOutlier) - Number(a.isOutlier) || (b.aiConfidenceScore || 0) - (a.aiConfidenceScore || 0));

  return NextResponse.json({
    label: 'others like this',
    method: 'uses cached topic/cluster/theme assignments from the offline batch; no real-time embedding search',
    totalMatches: sorted.length,
    examples: filters.lens === 'government' ? [] : sorted.slice(0, 8).map((row) => ({
      id: row.id,
      title: storyTitle(row),
      topicLabel: row.corpusTopic?.label || null,
      clusterId: row.clusterId,
      isLessCommonExperience: row.isOutlier,
      excerpt: anonymizedExcerpt(row),
    })),
  });
}
