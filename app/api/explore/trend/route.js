import { NextResponse } from 'next/server';
import { getAlgorithmLandscape, getApprovedBriefingCorpus, monthKey, normalizeThemes, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const [rows, algorithms] = await Promise.all([
    getApprovedBriefingCorpus(filters),
    getAlgorithmLandscape(filters),
  ]);
  const buckets = new Map();
  for (const row of rows) {
    const month = monthKey(row.submittedAt);
    const bucket = buckets.get(month) || { month, total: 0, impact: {}, themes: {} };
    bucket.total += 1;
    const impact = row.aiImpactClassification || 'Unknown';
    bucket.impact[impact] = (bucket.impact[impact] || 0) + 1;
    for (const { theme } of normalizeThemes(row.aiThemes)) {
      bucket.themes[theme] = (bucket.themes[theme] || 0) + 1;
    }
    buckets.set(month, bucket);
  }
  const markers = algorithms
    .filter((algorithm) => algorithm.yearDeployed || algorithm.currentVersion)
    .map((algorithm) => ({
      algorithmSlug: algorithm.slug,
      algorithmName: algorithm.name,
      yearDeployed: algorithm.yearDeployed,
      currentVersion: algorithm.currentVersion,
    }));

  return NextResponse.json({ label: 'monthly suggested pattern trend', buckets: [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month)), markers });
}
