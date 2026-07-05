import { NextResponse } from 'next/server';
import { getApprovedBriefingCorpus, normalizeThemes } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const rows = await getApprovedBriefingCorpus({
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
  });
  const byTheme = new Map();
  for (const row of rows) {
    const algorithmNames = row.algorithmLinks.map((link) => link.algorithm.name);
    for (const item of normalizeThemes(row.aiThemes)) {
      const current = byTheme.get(item.theme) || { theme: item.theme, count: 0, confidenceSum: 0, confidenceCount: 0, domains: new Set(), algorithms: new Set() };
      current.count += 1;
      if (Number.isFinite(item.confidence)) {
        current.confidenceSum += item.confidence;
        current.confidenceCount += 1;
      }
      if (row.affectedDomain) current.domains.add(row.affectedDomain);
      for (const name of algorithmNames) current.algorithms.add(name);
      byTheme.set(item.theme, current);
    }
  }

  const themes = [...byTheme.values()].map((theme) => ({
    theme: theme.theme,
    label: 'suggested',
    count: theme.count,
    averageConfidence: theme.confidenceCount ? Number((theme.confidenceSum / theme.confidenceCount).toFixed(2)) : null,
    spanDomains: theme.domains.size,
    spanAlgorithms: theme.algorithms.size,
  })).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));

  return NextResponse.json({ totalStories: rows.length, themes });
}

