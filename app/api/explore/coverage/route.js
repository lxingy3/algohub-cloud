import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus } from '../../../../lib/briefingsExplore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const rows = await getApprovedBriefingCorpus({
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
  });
  const dates = rows.map((row) => row.submittedAt).filter(Boolean).sort((a, b) => a - b);

  return NextResponse.json({
    label: 'provenance and paradata',
    total: rows.length,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    submissionMethod: countBy(rows, (row) => row.submissionMethod),
    language: countBy(rows, (row) => row.originalLanguage),
    domain: countBy(rows, (row) => row.affectedDomain),
    neighbourhood: countBy(rows, (row) => row.neighbourhood),
    whatsMissing: {
      noNeighbourhood: rows.filter((row) => !row.neighbourhood).length,
      noAlgorithmLink: rows.filter((row) => row.algorithmLinks.length === 0).length,
      noAiThemes: rows.filter((row) => !Array.isArray(row.aiThemes) || row.aiThemes.length === 0).length,
      nonEnglish: rows.filter((row) => row.originalLanguage && row.originalLanguage !== 'en').length,
    },
  });
}

