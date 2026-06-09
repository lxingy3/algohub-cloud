import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { getCurrentUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const MAX_MEDIA_UPLOAD_BYTES = 4 * 1024 * 1024;
const RETURNED_STATUSES = new Set(['FLAGGED', 'REJECTED']);
const IMPACT_VALUES = new Set(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']);

function formText(formData, key) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isChecked(value) {
  return value === 'on' || value === 'true' || value === true;
}

function mediaExtension(file) {
  const originalExtension = file?.name?.split('.').pop()?.toLowerCase();
  if (originalExtension && /^[a-z0-9]{2,5}$/.test(originalExtension)) return originalExtension;
  if (!file?.type) return 'webm';
  if (file.type.includes('mp4')) return 'mp4';
  if (file.type.includes('mpeg')) return 'mp3';
  if (file.type.includes('quicktime')) return 'mov';
  if (file.type.includes('x-m4a')) return 'm4a';
  if (file.type.includes('ogg')) return 'ogg';
  if (file.type.includes('wav')) return 'wav';
  return 'webm';
}

async function saveMediaFile(file, folder) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) throw new Error('MEDIA_FILE_TOO_LARGE');

  const buffer = Buffer.from(await file.arrayBuffer());
  if (process.env.VERCEL) {
    return `data:${file.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  }

  const uploadRoot = join(process.cwd(), 'public', 'uploads', 'testimonies', folder);
  const fileName = `${Date.now()}-${randomUUID()}.${mediaExtension(file)}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(join(uploadRoot, fileName), buffer);
  return `/uploads/testimonies/${folder}/${fileName}`;
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
  if (!RETURNED_STATUSES.has(existing.moderationStatus)) {
    return NextResponse.json({ error: 'Only flagged or rejected stories can be edited and resubmitted.' }, { status: 400 });
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

  const replacementAudio = formData.get('audioFile');
  const replacementVideo = formData.get('videoFile');
  let audioFileUrl = existing.audioFileUrl;
  let videoFileUrl = existing.videoFileUrl;

  try {
    if (storyType === 'voice' && replacementAudio && replacementAudio.size > 0) {
      audioFileUrl = await saveMediaFile(replacementAudio, 'audio');
    }
    if (storyType === 'video' && replacementVideo && replacementVideo.size > 0) {
      videoFileUrl = await saveMediaFile(replacementVideo, 'video');
    }
  } catch (error) {
    if (error.message === 'MEDIA_FILE_TOO_LARGE') {
      return NextResponse.json({ error: 'Please upload a media file smaller than 4 MB.' }, { status: 413 });
    }
    return NextResponse.json({ error: 'The media file could not be saved.' }, { status: 500 });
  }

  if (storyType === 'voice' && !audioFileUrl) {
    return NextResponse.json({ error: 'Please upload a voice story.' }, { status: 400 });
  }
  if (storyType === 'video' && !videoFileUrl) {
    return NextResponse.json({ error: 'Please upload a video story.' }, { status: 400 });
  }

  const fallbackNarrative =
    storyType === 'voice'
      ? 'A voice story was submitted.'
      : storyType === 'video'
        ? 'A video story was submitted.'
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
        summary: storedNarrative.length > 160 ? `${storedNarrative.slice(0, 157)}...` : storedNarrative,
        submitterName: formText(formData, 'name') || user.name,
        submitterEmail: user.email,
        selfReportedImpact,
        audioFileUrl,
        videoFileUrl,
        moderationStatus: 'PENDING',
        submittedAt: new Date(),
      },
    });

    await tx.testimonyAlgorithmLink.deleteMany({ where: { testimonyId: existing.id } });
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
