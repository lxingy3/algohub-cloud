import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus, minGroupCountForLens, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
  const groups = new Map();
  for (const row of rows) {
    const key = filters.dimension === 'agency'
      ? row.algorithmLinks[0]?.algorithm.agencyName || 'Unknown agency'
      : row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain';
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return NextResponse.json({
    dimension: filters.dimension === 'agency' ? 'agency' : 'domain',
    groups: [...groups.entries()].map(([label, items]) => ({
      label,
      total: items.length,
      impact: countBy(items, (item) => item.aiImpactClassification, { minCount }),
      outliers: items.filter((item) => item.isOutlier).length,
    })).filter((row) => row.total >= minCount)
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
  });
}
