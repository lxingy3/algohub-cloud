import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rows = await getApprovedBriefingCorpus(parseExploreFilters(request));
  const confidences = rows.map((row) => row.aiConfidenceScore).filter((score) => Number.isFinite(score));
  const averageConfidence = confidences.length
    ? Number((confidences.reduce((sum, score) => sum + score, 0) / confidences.length).toFixed(2))
    : null;

  return NextResponse.json({
    label: 'suggested impact distribution',
    total: rows.length,
    selfReported: countBy(rows, (row) => row.selfReportedImpact),
    aiSuggested: countBy(rows, (row) => row.aiImpactClassification),
    averageConfidence,
    mismatchCount: rows.filter((row) => row.selfReportedImpact && row.aiImpactClassification && row.selfReportedImpact !== row.aiImpactClassification).length,
  });
}
