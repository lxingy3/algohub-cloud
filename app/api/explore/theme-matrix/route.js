import { NextResponse } from 'next/server';
import { getApprovedBriefingCorpus, normalizeThemes, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const cells = new Map();
  for (const row of rows) {
    const domain = row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown';
    for (const { theme } of normalizeThemes(row.aiThemes)) {
      const key = `${domain}|||${theme}`;
      cells.set(key, (cells.get(key) || 0) + 1);
    }
  }
  return NextResponse.json({
    label: 'suggested domain-theme matrix',
    rows: [...cells.entries()].map(([key, count]) => {
      const [domain, theme] = key.split('|||');
      return { domain, theme, count };
    }).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain) || a.theme.localeCompare(b.theme)),
  });
}

