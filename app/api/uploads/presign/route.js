import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  assertMediaUpload,
  createSignedMediaUpload,
  hasFirebaseStorageConfig,
  mediaStorageProvider,
  mediaStorageUri,
} from '../../../../lib/mediaStorage';

export const dynamic = 'force-dynamic';

const uploadSchema = z.object({
  kind: z.enum(['audio', 'video', 'image']),
  scope: z.enum(['eventImage', 'organizationLogo']).optional(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1),
  size: z.number().positive(),
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function cleanExtension(fileName, contentType) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;
  const normalizedContentType = String(contentType || '').toLowerCase();
  if (normalizedContentType.startsWith('video/') && normalizedContentType.includes('mp4')) return 'mp4';
  if (normalizedContentType.includes('quicktime')) return 'mov';
  if (normalizedContentType.includes('x-m4v')) return 'm4v';
  if (normalizedContentType === 'audio/mp4' || normalizedContentType.includes('m4a')) return 'm4a';
  if (normalizedContentType.includes('mpeg') || normalizedContentType.includes('mp3')) return 'mp3';
  if (normalizedContentType.includes('mp4')) return 'mp4';
  if (normalizedContentType.includes('wav')) return 'wav';
  if (normalizedContentType.includes('webm')) return 'webm';
  if (normalizedContentType.includes('flac')) return 'flac';
  if (normalizedContentType.includes('ogg')) return 'ogg';
  if (normalizedContentType === 'image/jpeg') return 'jpg';
  if (normalizedContentType === 'image/png') return 'png';
  if (normalizedContentType === 'image/webp') return 'webp';
  return normalizedContentType.startsWith('video/') ? 'webm' : 'webm';
}

export async function POST(request) {
  if (!hasFirebaseStorageConfig()) {
    return NextResponse.json({ error: 'Cloud media storage is not configured for this deployment.' }, { status: 503 });
  }

  const result = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const { kind, scope, fileName, contentType, size } = result.data;

  if (kind === 'image') {
    if (!IMAGE_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Please upload a JPEG, PNG, or WebP image.' }, { status: 400 });
    }
    if (Number(size) > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Please upload an image smaller than 10 MB.' }, { status: 400 });
    }
  } else {
    try {
      assertMediaUpload({ contentType, size });
    } catch (error) {
      const message = error.message === 'MEDIA_FILE_TOO_LARGE'
        ? 'Please upload a media file smaller than 200 MB.'
        : 'Please upload an audio or video file.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const extension = cleanExtension(fileName, contentType);
  const datePrefix = new Date().toISOString().slice(0, 10);
  const objectKey = kind === 'image'
    ? imageObjectKey({ scope, datePrefix, extension })
    : `testimonies/${kind}/${datePrefix}/${randomUUID()}.${extension}`;
  const uploadUrl = await createSignedMediaUpload({ objectKey, contentType });

  return NextResponse.json({
    uploadUrl,
    objectKey,
    storageUri: mediaStorageUri(objectKey),
    provider: mediaStorageProvider,
    contentType,
  });
}

function imageObjectKey({ scope, datePrefix, extension }) {
  if (scope === 'organizationLogo') {
    return `organizations/logos/${datePrefix}/${randomUUID()}.${extension}`;
  }
  return `events/images/${datePrefix}/${randomUUID()}.${extension}`;
}
