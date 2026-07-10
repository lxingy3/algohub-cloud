import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus, minGroupCountForLens, parseExploreFilters } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';
const REVIEW_THRESHOLD = 0.85;

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const rows = await getApprovedBriefingCorpus(filters);
  const minCount = minGroupCountForLens(filters.lens);
  const confidences = rows.map((row) => row.aiConfidenceScore).filter((score) => Number.isFinite(score));
  const averageConfidence = confidences.length
    ? Number((confidences.reduce((sum, score) => sum + score, 0) / confidences.length).toFixed(2))
    : null;

  return NextResponse.json({
    label: 'suggested impact distribution',
    method: `stored impact labels with self-reported impact comparison; confidence <= ${REVIEW_THRESHOLD} stays in review`,
    total: rows.length,
    selfReported: countBy(rows, (row) => row.selfReportedImpact, { minCount }),
    aiSuggested: countBy(rows, (row) => row.aiImpactClassification, { minCount }),
    averageConfidence,
    reviewThreshold: REVIEW_THRESHOLD,
    reviewRequiredCount: rows.filter((row) => !Number.isFinite(row.aiConfidenceScore) || row.aiConfidenceScore <= REVIEW_THRESHOLD).length,
    mismatchCount: rows.filter((row) => row.selfReportedImpact && row.aiImpactClassification && row.selfReportedImpact !== row.aiImpactClassification).length,
  });
}
