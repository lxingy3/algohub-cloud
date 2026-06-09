import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const items = await prisma.testimony.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      sourceId: true,
      title: true,
      summary: true,
      city: true,
      zipCode: true,
      imageUrl: true,
      submitterName: true,
      submitterEmail: true,
      referralSource: true,
      publicPosting: true,
      followupConsent: true,
      storyType: true,
      isAnonymous: true,
      userId: true,
      partnerOrgId: true,
      facilitatorId: true,
      narrativeText: true,
      submissionMethod: true,
      audioFileUrl: true,
      videoFileUrl: true,
      originalLanguage: true,
      affectedDomain: true,
      selfReportedImpact: true,
      aiImpactClassification: true,
      aiThemes: true,
      aiLinkedAlgorithmIds: true,
      aiConfidenceScore: true,
      aiExtractedExperiences: true,
      aiProcessedAt: true,
      moderationStatus: true,
      moderatorId: true,
      moderationNotes: true,
      submittedAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      algorithmLinks: { select: { linkType: true, confidence: true, algorithm: true } },
    },
  });

  return NextResponse.json({ items, total: items.length });
}
