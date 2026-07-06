import { NextResponse } from 'next/server';
import { getApprovedBriefingCorpus, minGroupCountForLens, normalizeThemes, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
  const cells = new Map();
  for (const row of rows) {
    const groups = filters.dimension === 'algorithm'
      ? row.algorithmLinks.map((link) => link.algorithm.name).filter(Boolean)
      : [row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown'];
    for (const { theme } of normalizeThemes(row.aiThemes)) {
      for (const group of groups.length ? groups : ['Unknown']) {
        const key = `${group}|||${theme}`;
        cells.set(key, (cells.get(key) || 0) + 1);
      }
    }
  }
  return NextResponse.json({
    label: `suggested ${filters.dimension === 'algorithm' ? 'algorithm' : 'domain'}-theme matrix`,
    dimension: filters.dimension === 'algorithm' ? 'algorithm' : 'domain',
    rows: [...cells.entries()].map(([key, count]) => {
      const [group, theme] = key.split('|||');
      return { group, domain: filters.dimension === 'algorithm' ? null : group, algorithm: filters.dimension === 'algorithm' ? group : null, theme, count };
    }).filter((row) => row.count >= minCount)
      .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group) || a.theme.localeCompare(b.theme)),
  });
}
