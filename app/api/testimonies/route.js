import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { mediaStorageProvider, mediaStorageUri } from '../../../lib/mediaStorage';
import { rankStoriesForSearch } from '../../../lib/searchRanking';

export const dynamic = 'force-dynamic';

const testimonySchema = z.object({
  title: z.string().trim().min(1),
  name: z.string().trim().optional(),
  city: z.string().trim().min(1),
  zipCode: z.string().trim().optional(),
  occurredAtText: z.string().trim().optional(),
  referralSource: z.string().trim().optional(),
  facilitatorCode: z.string().trim().optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  narrativeText: z.string().trim().optional(),
  algorithmId: z.string().trim().optional(),
  uncertainSystem: z.boolean().optional(),
  affectedDomain: z.string().trim().optional(),
  selfReportedImpact: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']).optional(),
  publicPosting: z.boolean(),
  followupConsent: z.literal(true),
  isAnonymous: z.boolean().optional(),
  storyType: z.enum(['text', 'voice', 'video', 'facilitated']),
  mediaObjectKey: z.string().trim().optional(),
  mediaUrl: z.string().trim().optional(),
  mediaMimeType: z.string().trim().optional(),
  mediaDurationSeconds: z.number().int().nonnegative().optional(),
});

function isChecked(value) {
  return value === 'on' || value === 'true' || value === true;
}

function formText(formData, key) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

const testimonyListSelect = {
  id: true,
  sourceId: true,
  title: true,
  summary: true,
  city: true,
  zipCode: true,
  imageUrl: true,
  submitterName: true,
  referralSource: true,
  publicPosting: true,
  followupConsent: true,
  storyType: true,
  isAnonymous: true,
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
  submittedAt: true,
  updatedAt: true,
  algorithmLinks: { select: { linkType: true, confidence: true, algorithm: true } },
  _count: { select: { comments: true, reactions: true } },
};

const testimonySearchSelect = {
  ...testimonyListSelect,
  transcriptionText: true,
  brief: { select: { summary: true } },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
  const jurisdictionId = getJurisdictionId();
  const search = searchParams.get('search') || '';
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

  if (search) {
    const candidates = await prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: testimonySearchSelect,
    });
    const ranked = rankStoriesForSearch(candidates, search);
    const items = ranked.slice((page - 1) * limit, page * limit).map((story) => {
      const item = { ...story };
      delete item.brief;
      delete item.transcriptionText;
      return item;
    });

    return NextResponse.json({ items, page, limit, total: ranked.length });
  }

  const [items, total] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: testimonyListSelect,
    }),
    prisma.testimony.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const contentType = request.headers.get('content-type') || '';
  const formData = contentType.includes('application/json') ? null : await request.formData();
  const payload = formData ? {
    title: formText(formData, 'title'),
    name: formText(formData, 'name'),
    city: formText(formData, 'city'),
    zipCode: formText(formData, 'zipCode'),
    occurredAtText: formText(formData, 'occurredAtText'),
    referralSource: formText(formData, 'referralSource'),
    facilitatorCode: formText(formData, 'facilitatorCode'),
    contactEmail: formText(formData, 'contactEmail'),
    narrativeText: formText(formData, 'narrativeText'),
    algorithmId: formText(formData, 'algorithmId'),
    affectedDomain: formText(formData, 'affectedDomain'),
    selfReportedImpact: formText(formData, 'selfReportedImpact') || 'UNCLEAR',
    publicPosting: isChecked(formData.get('publicPosting')),
    followupConsent: isChecked(formData.get('followupConsent')),
    isAnonymous: isChecked(formData.get('isAnonymous')),
    storyType: formText(formData, 'storyType') || 'text',
  } : await request.json().catch(() => null);
  const jurisdictionId = getJurisdictionId();
  const result = testimonySchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid testimony submission' }, { status: 400 });
  }

  const {
    title,
    name,
    city,
    zipCode,
    occurredAtText,
    referralSource,
    facilitatorCode,
    contactEmail,
    narrativeText,
    algorithmId,
    uncertainSystem,
    affectedDomain,
    selfReportedImpact,
    publicPosting,
    followupConsent,
    isAnonymous,
    storyType,
    mediaObjectKey,
    mediaUrl,
    mediaMimeType,
    mediaDurationSeconds,
  } = result.data;

  if ((storyType === 'voice' || storyType === 'video') && !mediaObjectKey) {
    return NextResponse.json({ error: 'Please record or upload media before submitting.' }, { status: 400 });
  }

  const fallbackNarrative =
    storyType === 'voice'
      ? 'A voice story was submitted and is waiting for transcription.'
      : storyType === 'video'
        ? 'A video story was submitted and is waiting for transcription.'
        : storyType === 'facilitated'
          ? 'A facilitated story session was submitted.'
          : '';
  const storedNarrative = narrativeText?.trim() || fallbackNarrative;
  const storedMediaUri = mediaObjectKey ? (mediaUrl || mediaStorageUri(mediaObjectKey)) : null;

  const testimony = await prisma.$transaction(async (tx) => {
    const created = await tx.testimony.create({
      data: {
      jurisdictionId,
      title,
      city: city || '',
      zipCode: zipCode || null,
      occurredAtText: occurredAtText || null,
      referralSource: referralSource || null,
      facilitatorCode: facilitatorCode || null,
      publicPosting,
      followupConsent,
      storyType,
      narrativeText: storedNarrative,
      summary: storedNarrative.length > 160 ? `${storedNarrative.slice(0, 157)}...` : storedNarrative,
      userId: user?.id,
      submitterName: isAnonymous ? null : (name || user?.name),
      submitterEmail: contactEmail || user?.email,
      contactEmail: contactEmail || null,
      isAnonymous: Boolean(isAnonymous),
      submissionMethod: storyType === 'facilitated' ? 'FACILITATED_SESSION' : storyType === 'voice' || storyType === 'video' ? 'AUDIO_TRANSCRIPTION' : 'WEB_FORM',
      audioFileUrl: storyType === 'voice' ? storedMediaUri : null,
      videoFileUrl: storyType === 'video' ? storedMediaUri : null,
      mediaStorageProvider: mediaObjectKey ? mediaStorageProvider : null,
      mediaObjectKey: mediaObjectKey || null,
      mediaMimeType: mediaMimeType || null,
      mediaDurationSeconds: mediaDurationSeconds || null,
      transcriptionStatus: storyType === 'voice' || storyType === 'video' ? 'PENDING' : 'NOT_REQUIRED',
      selfReportedImpact,
      affectedDomain: affectedDomain || null,
      moderationStatus: 'PENDING',
      },
    });

    if (algorithmId && !uncertainSystem) {
      await tx.testimonyAlgorithmLink.create({
        data: {
          testimonyId: created.id,
        algorithmId,
        linkType: 'SUBMITTER_IDENTIFIED',
        confidence: 1,
        },
      });
    }

    if ((storyType === 'voice' || storyType === 'video') && mediaObjectKey) {
      await tx.transcriptionJob.create({
        data: {
          testimonyId: created.id,
          jurisdictionId,
          mediaKind: storyType === 'video' ? 'video' : 'audio',
          objectKey: mediaObjectKey,
          mediaUrl: storedMediaUri,
          storageProvider: mediaStorageProvider,
          mimeType: mediaMimeType || null,
          provider: 'open-source-pipeline-pending',
        },
      });
    }

    return created;
  });

  return contentType.includes('application/json')
    ? NextResponse.json({ id: testimony.id, redirectTo: '/stories' }, { status: 201 })
    : NextResponse.redirect(new URL('/stories', request.url), { status: 303 });
}
