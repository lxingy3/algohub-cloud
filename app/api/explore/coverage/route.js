import { NextResponse } from 'next/server';
import { countBy, getApprovedBriefingCorpus } from '../../../../lib/briefingsExplore';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const rows = await getApprovedBriefingCorpus({
    algorithm: params.get('algorithm') || '',
    domain: params.get('domain') || '',
  });
  const briefings = await prisma.briefing.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      ...(params.get('algorithm') ? { targetAlgorithm: { slug: params.get('algorithm') } } : {}),
    },
    select: {
      reviewStatus: true,
      generatedBy: true,
      reviewedByUserId: true,
    },
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
    partnerOrganization: countBy(rows, (row) => row.partnerOrganization?.name),
    briefings: {
      total: briefings.length,
      reviewStatus: countBy(briefings, (row) => row.reviewStatus),
      generatedBy: countBy(briefings, (row) => row.generatedBy),
      reviewerStatus: countBy(briefings, (row) => row.reviewedByUserId ? 'reviewed' : 'not reviewed'),
    },
    whatsMissing: {
      noNeighbourhood: rows.filter((row) => !row.neighbourhood).length,
      noPartnerOrganization: rows.filter((row) => !row.partnerOrganization).length,
      noAlgorithmLink: rows.filter((row) => row.algorithmLinks.length === 0).length,
      noAiThemes: rows.filter((row) => !Array.isArray(row.aiThemes) || row.aiThemes.length === 0).length,
      nonEnglish: rows.filter((row) => row.originalLanguage && row.originalLanguage !== 'en').length,
    },
  });
}
