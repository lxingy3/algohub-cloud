import { NextResponse } from 'next/server';
import { countBy, evidenceLevel, getApprovedBriefingCorpus, minGroupCountForLens, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

function summarizeRepresentation(items) {
  const positiveCount = items.filter((item) => item.aiImpactClassification === 'POSITIVE' || item.selfReportedImpact === 'POSITIVE').length;
  const dissentCount = items.filter((item) => (
    item.selfReportedImpact
    && item.aiImpactClassification
    && item.selfReportedImpact !== item.aiImpactClassification
  )).length;
  const minorityCount = items.filter((item) => item.isOutlier).length;

  return {
    positiveCount,
    minorityCount,
    dissentCount,
  };
}

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
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
      impactMix: countBy(items, (item) => item.aiImpactClassification, { minCount }),
      representation: summarizeRepresentation(items),
    };
  }).filter((row) => row.count >= minCount)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return NextResponse.json({
    label: 'suggested evidence strength',
    method: 'derived statistics over stored story counts, BART-MNLI confidence, impact mix, and HDBSCAN outlier flags',
    totalStories: rows.length,
    representation: summarizeRepresentation(rows),
    findings,
  });
}
