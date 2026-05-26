import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  const formData = await request.formData();
  const jurisdictionId = getJurisdictionId();
  const narrativeText = String(formData.get('narrativeText') || '').trim();
  const algorithmId = String(formData.get('algorithmId') || '');

  const testimony = await prisma.testimony.create({
    data: {
      jurisdictionId,
      title: String(formData.get('title') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      narrativeText,
      summary: narrativeText.length > 160 ? `${narrativeText.slice(0, 157)}...` : narrativeText,
      userId: user?.id,
      submitterName: user?.name,
      submitterEmail: user?.email,
      isAnonymous: !user,
      submissionMethod: 'WEB_FORM',
      moderationStatus: 'PENDING',
    },
  });

  if (algorithmId) {
    await prisma.testimonyAlgorithmLink.create({
      data: {
        testimonyId: testimony.id,
        algorithmId,
        linkType: 'SUBMITTER_IDENTIFIED',
        confidence: 1,
      },
    });
  }

  return NextResponse.redirect(new URL('/stories', request.url), { status: 303 });
}
