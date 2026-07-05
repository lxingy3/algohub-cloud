import { NextResponse } from 'next/server';
import { getApprovedBriefingCorpus, normalizeThemes, parseExploreFilters } from '../../../../lib/briefingsExplore';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rows = await getApprovedBriefingCorpus(parseExploreFilters(request));
  const byTheme = new Map();
  const byPair = new Map();
  for (const row of rows) {
    const algorithmNames = row.algorithmLinks.map((link) => link.algorithm.name);
    const rowThemes = normalizeThemes(row.aiThemes);
    for (const item of rowThemes) {
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
    const uniqueThemes = [...new Set(rowThemes.map((item) => item.theme))].sort((a, b) => a.localeCompare(b));
    for (let i = 0; i < uniqueThemes.length; i += 1) {
      for (let j = i + 1; j < uniqueThemes.length; j += 1) {
        const key = `${uniqueThemes[i]}|||${uniqueThemes[j]}`;
        byPair.set(key, (byPair.get(key) || 0) + 1);
      }
    }
  }

  const maps = await prisma.themeImprovementMap.findMany({
    where: {
      OR: [
        { jurisdictionId: getJurisdictionId() },
        { jurisdictionId: null },
      ],
    },
    select: {
      theme: true,
      improvementDirection: true,
      policyDirection: true,
    },
  });
  const directionByTheme = new Map(maps.map((item) => [item.theme.toLowerCase(), item]));

  const themes = [...byTheme.values()].map((theme) => {
    const direction = directionByTheme.get(theme.theme.toLowerCase());
    return {
      theme: theme.theme,
      label: 'suggested',
      count: theme.count,
      averageConfidence: theme.confidenceCount ? Number((theme.confidenceSum / theme.confidenceCount).toFixed(2)) : null,
      spanDomains: theme.domains.size,
      spanAlgorithms: theme.algorithms.size,
      improvementDirection: direction?.improvementDirection || null,
      policyDirection: direction?.policyDirection || null,
    };
  }).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));

  const coOccurrences = [...byPair.entries()].map(([key, count]) => {
    const [source, target] = key.split('|||');
    return { source, target, count };
  }).sort((a, b) => b.count - a.count || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  return NextResponse.json({ totalStories: rows.length, themes, coOccurrences });
}
