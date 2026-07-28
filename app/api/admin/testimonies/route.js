import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const requestedPage = Number.parseInt(params.get('page') || '1', 10);
  const requestedLimit = Number.parseInt(params.get('limit') || '50', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const where = { jurisdictionId: getJurisdictionId() };
  const [items, total] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
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
        algorithmLinks: {
          select: {
            linkType: true,
            confidence: true,
            algorithm: { select: { id: true, slug: true, name: true, useCase: true, status: true } },
          },
        },
      },
    }),
    prisma.testimony.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
