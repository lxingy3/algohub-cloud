import { NextResponse } from 'next/server';
import { getAlgorithmLandscape, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { BRIEFINGS_EMBEDDING_MODEL, getSemanticEmbeddingMap, SEMANTIC_RELEVANCE_THRESHOLD } from '../../../../lib/semanticEmbeddings';
import { buildSilenceAnalysis } from '../../../../lib/silenceAnalysis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const [algorithms, stories] = await Promise.all([
    getAlgorithmLandscape(filters),
    getApprovedBriefingCorpus(filters),
  ]);
  const [storyEmbeddings, algorithmEmbeddings] = await Promise.all([
    getSemanticEmbeddingMap('testimony', stories.map((story) => story.id)),
    getSemanticEmbeddingMap('algorithm', algorithms.map((algorithm) => algorithm.id)),
  ]);
  const analysis = buildSilenceAnalysis({ algorithms, stories, algorithmEmbeddings, storyEmbeddings });
  const requestedPriority = filters.silencePriority.toLowerCase();
  const priorityFilter = ['critical', 'high', 'medium'].includes(requestedPriority) ? requestedPriority : '';

  return NextResponse.json({
    label: 'suggested silence review queue',
    method: analysis.semanticCacheUsed
      ? `four-factor silence detector with ${BRIEFINGS_EMBEDDING_MODEL} cosine > ${SEMANTIC_RELEVANCE_THRESHOLD}: volume gap, semantic gap, domain gap, and impact weight`
      : 'four-factor silence detector using the saved topic/cluster/UMAP fallback until the sentence-transformers cache is available',
    rows: analysis.rows.filter((row) => !priorityFilter || row.priority === priorityFilter),
  });
}
