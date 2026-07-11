import { NextResponse } from 'next/server';
import { countBy, getAlgorithmLandscape, getApprovedBriefingCorpus, minGroupCountForLens, normalizeThemes, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { canonicalBriefingDomain } from '../../../../lib/briefingDomainMatch';
import { BRIEFINGS_EMBEDDING_MODEL, getSemanticEmbeddingMap } from '../../../../lib/semanticEmbeddings';
import { buildSilenceAnalysis } from '../../../../lib/silenceAnalysis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const [rows, algorithms] = await Promise.all([
    getApprovedBriefingCorpus(filters),
    getAlgorithmLandscape(filters),
  ]);
  const [storyEmbeddings, algorithmEmbeddings] = await Promise.all([
    getSemanticEmbeddingMap('testimony', rows.map((row) => row.id)),
    getSemanticEmbeddingMap('algorithm', algorithms.map((algorithm) => algorithm.id)),
  ]);
  const silence = buildSilenceAnalysis({ algorithms, stories: rows, storyEmbeddings, algorithmEmbeddings });
  const minCount = minGroupCountForLens(filters.lens);
  const groups = new Map();
  for (const row of rows) {
    const labels = filters.dimension === 'agency'
      ? [...new Set(row.algorithmLinks.map((link) => link.algorithm.agencyName).filter(Boolean))]
      : [row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain'];
    for (const label of labels.length ? labels : ['Unknown agency']) {
      const group = groups.get(label) || new Map();
      group.set(row.id, row);
      groups.set(label, group);
    }
  }
  return NextResponse.json({
    method: `domain or agency grouping over approved stories, stored themes and impact labels, HDBSCAN outlier flags, and ${BRIEFINGS_EMBEDDING_MODEL} silence coverage`,
    dimension: filters.dimension === 'agency' ? 'agency' : 'domain',
    groups: [...groups.entries()].map(([label, itemMap]) => {
      const items = [...itemMap.values()];
      const relatedSilence = silence.rows.filter((row) => filters.dimension === 'agency'
        ? row.agencyName === label
        : canonicalBriefingDomain(row.useCase) === canonicalBriefingDomain(label));
      const averageSilenceScore = relatedSilence.length
        ? Number((relatedSilence.reduce((sum, row) => sum + row.silenceScore, 0) / relatedSilence.length).toFixed(2))
        : null;
      return {
        label,
        total: items.length,
        impact: countBy(items, (item) => item.aiImpactClassification, { minCount }),
        themes: countBy(items.flatMap((item) => normalizeThemes(item.aiThemes)), (item) => item.theme, { minCount }),
        outliers: items.filter((item) => item.isOutlier).length,
        averageSilenceScore,
      };
    }).filter((row) => row.total >= minCount)
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
  });
}
