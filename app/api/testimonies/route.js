import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const MAX_MEDIA_UPLOAD_BYTES = 4 * 1024 * 1024;

const testimonySchema = z.object({
  title: z.string().trim().min(1),
  name: z.string().trim().optional(),
  city: z.string().trim().min(1),
  zipCode: z.string().trim().optional(),
  referralSource: z.string().trim().optional(),
  narrativeText: z.string().trim().optional(),
  algorithmId: z.string().trim().optional(),
  selfReportedImpact: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']).optional(),
  publicPosting: z.boolean(),
  followupConsent: z.literal(true),
  storyType: z.enum(['text', 'voice', 'video']),
});

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
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('MEDIA_FILE_TOO_LARGE');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (process.env.VERCEL) {
    return `data:${file.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  }

  const uploadRoot = join(process.cwd(), 'public', 'uploads', 'testimonies', folder);
  const fileName = `${Date.now()}-${randomUUID()}.${mediaExtension(file)}`;
  try {
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(join(uploadRoot, fileName), buffer);
    return `/uploads/testimonies/${folder}/${fileName}`;
  } catch (error) {
    console.error('Could not save local testimony media', error);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
  const jurisdictionId = getJurisdictionId();
  const domain = searchParams.get('domain') || '';
  const impact = searchParams.get('impact') || '';
  const algorithmId = searchParams.get('algorithm') || '';

  const where = {
    jurisdictionId,
    moderationStatus: 'APPROVED',
    ...(domain ? { affectedDomain: domain } : {}),
    ...(impact ? { selfReportedImpact: impact } : {}),
    ...(algorithmId ? { algorithmLinks: { some: { algorithmId } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        algorithmLinks: { include: { algorithm: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.testimony.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const formData = await request.formData();
  const jurisdictionId = getJurisdictionId();
  const result = testimonySchema.safeParse({
    title: formData.get('title'),
    name: formData.get('name'),
    city: formData.get('city'),
    zipCode: formData.get('zipCode'),
    referralSource: formData.get('referralSource'),
    narrativeText: formData.get('narrativeText'),
    algorithmId: formData.get('algorithmId'),
    selfReportedImpact: formData.get('selfReportedImpact') || 'UNCLEAR',
    publicPosting: isChecked(formData.get('publicPosting')),
    followupConsent: isChecked(formData.get('followupConsent')),
    storyType: formData.get('storyType') || 'text',
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid testimony submission' }, { status: 400 });
  }

  const {
    title,
    name,
    city,
    zipCode,
    referralSource,
    narrativeText,
    algorithmId,
    selfReportedImpact,
    publicPosting,
    followupConsent,
    storyType,
  } = result.data;
  const audioFile = formData.get('audioFile');
  const videoFile = formData.get('videoFile');
  let audioFileUrl = null;
  let videoFileUrl = null;
  try {
    audioFileUrl = storyType === 'voice' ? await saveMediaFile(audioFile, 'audio') : null;
    videoFileUrl = storyType === 'video' ? await saveMediaFile(videoFile, 'video') : null;
  } catch (error) {
    if (error.message === 'MEDIA_FILE_TOO_LARGE') {
      return NextResponse.json({ error: 'Please upload a media file smaller than 4 MB.' }, { status: 413 });
    }
    console.error('Could not process testimony media', error);
    return NextResponse.json({ error: 'The media file could not be saved.' }, { status: 500 });
  }
  const fallbackNarrative =
    storyType === 'voice'
      ? 'A voice story was submitted.'
      : storyType === 'video'
        ? 'A video story was submitted.'
        : '';
  const storedNarrative = narrativeText?.trim() || fallbackNarrative;

  const testimony = await prisma.testimony.create({
    data: {
      jurisdictionId,
      title,
      city: city || '',
      zipCode: zipCode || null,
      referralSource: referralSource || null,
      publicPosting,
      followupConsent,
      storyType,
      narrativeText: storedNarrative,
      summary: storedNarrative.length > 160 ? `${storedNarrative.slice(0, 157)}...` : storedNarrative,
      userId: user?.id,
      submitterName: name || user?.name,
      submitterEmail: user?.email,
      isAnonymous: !name && !user,
      submissionMethod: storyType === 'voice' ? 'AUDIO_TRANSCRIPTION' : 'WEB_FORM',
      audioFileUrl,
      videoFileUrl,
      selfReportedImpact,
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
