import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, minGroupCountForLens, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { prisma } from '../../../../lib/prisma';
import { BRIEFINGS_EMBEDDING_MODEL } from '../../../../lib/semanticEmbeddings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
  const topicIds = [...new Set(rows.map((row) => row.topicId).filter((topicId) => topicId !== null))];
  const storedTopics = topicIds.length
    ? await prisma.corpusTopic.findMany({ where: { topicId: { in: topicIds } }, orderBy: { topicId: 'asc' } })
    : [];
  const stats = new Map();
  for (const row of rows) {
    if (row.topicId === null) continue;
    const current = stats.get(row.topicId) || { size: 0, algorithms: new Set(), domains: new Set() };
    current.size += 1;
    if (row.affectedDomain) current.domains.add(row.affectedDomain);
    for (const link of row.algorithmLinks) {
      current.algorithms.add(link.algorithm.id);
      if (link.algorithm.useCase) current.domains.add(link.algorithm.useCase);
    }
    stats.set(row.topicId, current);
  }
  const topics = storedTopics.map((topic) => {
    const filtered = stats.get(topic.topicId) || { size: 0, algorithms: new Set(), domains: new Set() };
    return {
      ...topic,
      corpusSize: topic.size,
      corpusSpanAlgorithms: topic.spanAlgorithms,
      corpusSpanDomains: topic.spanDomains,
      size: filtered.size,
      spanAlgorithms: filtered.algorithms.size,
      spanDomains: filtered.domains.size,
    };
  }).filter((topic) => topic.size >= minCount);

  return NextResponse.json({
    label: 'suggested corpus patterns',
    method: `saved corpus batch fields from ${BRIEFINGS_EMBEDDING_MODEL} via sentence-transformers, UMAP, HDBSCAN, BERTopic, and KeyBERT topic labels`,
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
