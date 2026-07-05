import { NextResponse } from 'next/server';
import { countBy, evidenceLevel, getApprovedBriefingCorpus } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const rows = await getApprovedBriefingCorpus({
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
  });
  const grouped = new Map();
  for (const row of rows) {
    const key = row.corpusTopic?.label || row.affectedDomain || 'Unlabeled';
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  }

  const findings = [...grouped.entries()].map(([label, items]) => {
    const confidences = items.map((item) => item.aiConfidenceScore).filter((score) => Number.isFinite(score));
    const avg = confidences.length ? confidences.reduce((sum, score) => sum + score, 0) / confidences.length : 0;
    const outliers = items.filter((item) => item.isOutlier).length;
    return {
      label,
      count: items.length,
      outliers,
      averageConfidence: confidences.length ? Number(avg.toFixed(2)) : null,
      strength: evidenceLevel(items.length, outliers, avg),
      impactMix: countBy(items, (item) => item.aiImpactClassification),
    };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return NextResponse.json({ label: 'suggested evidence strength', totalStories: rows.length, findings });
}

