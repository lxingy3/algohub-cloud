import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, normalizeThemes, parseExploreFilters, storyTitle, storedKeywords, topicClusterSimilarity, umapDistance } from '../../../../lib/briefingsExplore';
import { BRIEFINGS_EMBEDDING_MODEL, cosineSimilarity, getSemanticEmbeddingMap, meanEmbedding } from '../../../../lib/semanticEmbeddings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const sourceId = new URL(request.url).searchParams.get('story') || '';
  const rows = await getApprovedBriefingCorpus(filters);
  const theme = filters.theme;
  const matched = theme
    ? rows.filter((row) => normalizeThemes(row.aiThemes).some((item) => item.theme === theme))
    : rows.filter((row) => row.topicId !== null || row.clusterId !== null);
  const embeddings = await getSemanticEmbeddingMap('testimony', rows.map((row) => row.id));
  const source = sourceId ? rows.find((row) => row.id === sourceId) : null;
  const sourceVector = source
    ? embeddings.get(source.id)?.vector
    : meanEmbedding(matched.map((row) => embeddings.get(row.id)?.vector));
  const hasSemanticCache = Boolean(sourceVector);
  const sorted = hasSemanticCache
    ? rankByEmbedding(matched, embeddings, sourceVector).filter((row) => row.id !== sourceId)
    : rankSimilarStories(matched, source || centroidStory(matched)).filter((row) => row.id !== sourceId);
  const topics = new Set(sorted.map((row) => row.topicId).filter((id) => id !== null));
  const clusters = new Set(sorted.map((row) => row.clusterId).filter((id) => id !== null));

  return NextResponse.json({
    label: 'others like this',
    method: hasSemanticCache
      ? `sentence-transformers cosine nearest-neighbour over cached ${BRIEFINGS_EMBEDDING_MODEL} vectors`
      : 'topic, cluster, and UMAP fallback while the sentence-transformers cache is unavailable',
    totalMatches: sorted.length,
    sourceStoryId: sourceId || null,
    cachedEmbeddingCoverage: {
      topics: topics.size,
      clusters: clusters.size,
      model: BRIEFINGS_EMBEDDING_MODEL,
      storiesWithEmbeddings: rows.filter((row) => embeddings.has(row.id)).length,
      storiesWithCorpusFields: sorted.filter((row) => row.topicId !== null || row.clusterId !== null).length,
    },
    examples: filters.lens === 'government' ? [] : sorted.slice(0, 8).map((row) => ({
      id: row.id,
      title: storyTitle(row),
      topicLabel: row.corpusTopic?.label || null,
      clusterId: row.clusterId,
      similarityScore: row.similarityScore,
      matchBasis: row.matchBasis,
      isLessCommonExperience: row.isOutlier,
      keywords: storedKeywords(row),
      excerpt: anonymizedExcerpt(row),
    })),
  });
}

function rankByEmbedding(rows, embeddings, sourceVector) {
  return rows.map((row) => {
    const score = cosineSimilarity(sourceVector, embeddings.get(row.id)?.vector);
    return {
      ...row,
      similarityScore: Number.isFinite(score) ? Number(score.toFixed(3)) : null,
      matchBasis: 'sentence-transformers cosine similarity',
    };
  }).filter((row) => Number.isFinite(row.similarityScore))
    .sort((a, b) => b.similarityScore - a.similarityScore || Number(b.isOutlier) - Number(a.isOutlier));
}

function centroidStory(rows) {
  const points = rows.filter((row) => Number.isFinite(Number(row.umapX)) && Number.isFinite(Number(row.umapY)));
  if (!points.length) return rows[0] || null;
  const umapX = points.reduce((sum, row) => sum + Number(row.umapX), 0) / points.length;
  const umapY = points.reduce((sum, row) => sum + Number(row.umapY), 0) / points.length;
  const topicId = mostCommon(points.map((row) => row.topicId).filter((value) => value !== null));
  const clusterId = mostCommon(points.map((row) => row.clusterId).filter((value) => value !== null));
  return { id: '__centroid__', topicId, clusterId, umapX, umapY };
}

function rankSimilarStories(rows, source) {
  if (!source) return rows;
  return rows.map((row) => {
    const distance = umapDistance(source, row);
    const base = topicClusterSimilarity(source, row);
    const distanceBoost = Number.isFinite(distance) ? Math.max(0, 1 - Math.min(distance, 8) / 8) : 0;
    const similarityScore = Number(Math.min(1, base + distanceBoost * 0.35).toFixed(3));
    const matchBasis = row.topicId !== null && row.topicId === source.topicId
      ? 'same suggested topic'
      : row.clusterId !== null && row.clusterId === source.clusterId
        ? 'same embedding cluster'
        : Number.isFinite(distance)
          ? 'nearest saved embedding point'
          : 'theme match';
    return { ...row, similarityScore, matchBasis };
  }).sort((a, b) => b.similarityScore - a.similarityScore || Number(b.isOutlier) - Number(a.isOutlier) || (b.aiConfidenceScore || 0) - (a.aiConfidenceScore || 0));
}

function mostCommon(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
