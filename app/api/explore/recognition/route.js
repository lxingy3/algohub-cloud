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
  const topics = new Set(sorted.map((row) => row.topicId).filter((id) => id !== null));
  const clusters = new Set(sorted.map((row) => row.clusterId).filter((id) => id !== null));

  return NextResponse.json({
    label: 'others like this',
    method: 'offline sentence-transformers batch, using cached topic_id and cluster_id for retrieval',
    totalMatches: sorted.length,
    cachedEmbeddingCoverage: {
      topics: topics.size,
      clusters: clusters.size,
      storiesWithCorpusFields: sorted.filter((row) => row.topicId !== null || row.clusterId !== null).length,
    },
    examples: filters.lens === 'government' ? [] : sorted.slice(0, 8).map((row) => ({
      id: row.id,
      title: storyTitle(row),
      topicLabel: row.corpusTopic?.label || null,
      clusterId: row.clusterId,
      matchBasis: row.topicId !== null ? 'suggested topic' : row.clusterId !== null ? 'embedding cluster' : 'theme match',
      isLessCommonExperience: row.isOutlier,
      excerpt: anonymizedExcerpt(row),
    })),
  });
}
