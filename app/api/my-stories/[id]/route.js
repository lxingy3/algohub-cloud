import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { getCurrentUser } from '../../../../lib/auth';
import { buildStorySummary } from '../../../../lib/storySummary';

export const dynamic = 'force-dynamic';

const EDITABLE_STATUSES = new Set(['PENDING', 'FLAGGED', 'REJECTED']);
const IMPACT_VALUES = new Set(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']);

function formText(formData, key) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isChecked(value) {
  return value === 'on' || value === 'true' || value === true;
}

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const jurisdictionId = getJurisdictionId();
  const existing = await prisma.testimony.findFirst({
    where: { id, jurisdictionId, userId: user.id },
    select: {
      id: true,
      storyType: true,
      audioFileUrl: true,
      videoFileUrl: true,
      moderationStatus: true,
      algorithmLinks: { select: { algorithmId: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.has(existing.moderationStatus)) {
    return NextResponse.json({ error: 'Only pending, flagged, or rejected stories can be edited and resubmitted.' }, { status: 400 });
  }

  const formData = await request.formData();
  const title = formText(formData, 'title');
  const city = formText(formData, 'city');
  const storyType = existing.storyType || 'text';
  const narrativeText = formText(formData, 'narrativeText');
  const selfReportedImpact = formText(formData, 'selfReportedImpact') || 'UNCLEAR';
  const algorithmId = formText(formData, 'algorithmId');

  if (!title || !city || !isChecked(formData.get('followupConsent'))) {
    return NextResponse.json({ error: 'Please complete the required title, city, and follow-up consent fields.' }, { status: 400 });
  }
  if (!IMPACT_VALUES.has(selfReportedImpact)) {
    return NextResponse.json({ error: 'Invalid impact value.' }, { status: 400 });
  }
  if (storyType === 'text' && !narrativeText) {
    return NextResponse.json({ error: 'Please write your story.' }, { status: 400 });
  }

  let audioFileUrl = existing.audioFileUrl;
  let videoFileUrl = existing.videoFileUrl;
  const replacementAudio = formData.get('audioFile');
  const replacementVideo = formData.get('videoFile');
  if ((replacementAudio && replacementAudio.size > 0) || (replacementVideo && replacementVideo.size > 0)) {
    return NextResponse.json({ error: 'Media replacement now uses the secure signed-upload submission flow. Please submit a new voice story to replace audio media.' }, { status: 400 });
  }

  if (storyType === 'voice' && !audioFileUrl) {
    return NextResponse.json({ error: 'Please upload a voice story.' }, { status: 400 });
  }
  if (algorithmId) {
    const algorithm = await prisma.algorithm.findFirst({
      where: { id: algorithmId, jurisdictionId },
      select: { id: true },
    });
    if (!algorithm) return NextResponse.json({ error: 'Algorithm not found.' }, { status: 400 });
  }
  const fallbackNarrative =
    storyType === 'voice'
      ? 'A voice story was submitted.'
      : storyType === 'video'
        ? 'A legacy video story was submitted and should be displayed as a text transcript.'
        : '';
  const storedNarrative = narrativeText || fallbackNarrative;

  await prisma.$transaction(async (tx) => {
    await tx.testimony.update({
      where: { id: existing.id },
      data: {
        title,
        city,
        zipCode: formText(formData, 'zipCode') || null,
        referralSource: formText(formData, 'referralSource') || null,
        publicPosting: isChecked(formData.get('publicPosting')),
        followupConsent: true,
        narrativeText: storedNarrative,
        summary: buildStorySummary(storedNarrative),
        submitterName: formText(formData, 'name') || user.name,
        submitterEmail: user.email,
        selfReportedImpact,
        audioFileUrl,
        videoFileUrl,
        moderationStatus: 'PENDING',
        submittedAt: new Date(),
      },
    });

    await tx.testimonyAlgorithmLink.deleteMany({
      where: { testimonyId: existing.id, linkType: 'SUBMITTER_IDENTIFIED' },
    });
    if (algorithmId) {
      await tx.testimonyAlgorithmLink.create({
        data: {
          testimonyId: existing.id,
          algorithmId,
          linkType: 'SUBMITTER_IDENTIFIED',
          confidence: 1,
        },
      });
    }
  });

  return NextResponse.redirect(new URL('/my-stories?resubmitted=1', request.url), { status: 303 });
}
