import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertMediaUpload, createPresignedMediaUpload, hasR2Config, mediaPublicUrl } from '../../../../lib/r2';

export const dynamic = 'force-dynamic';

const uploadSchema = z.object({
  kind: z.enum(['audio', 'video']),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1),
  size: z.number().positive(),
});

function cleanExtension(fileName, contentType) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  return contentType.startsWith('video/') ? 'webm' : 'webm';
}

export async function POST(request) {
  if (!hasR2Config()) {
    return NextResponse.json({ error: 'Cloudflare R2 is not configured for this deployment.' }, { status: 503 });
  }

  const result = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const { kind, fileName, contentType, size } = result.data;

  try {
    assertMediaUpload({ contentType, size });
  } catch (error) {
    const message = error.message === 'MEDIA_FILE_TOO_LARGE'
      ? 'Please upload a media file smaller than 200 MB.'
      : 'Please upload an audio or video file.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const extension = cleanExtension(fileName, contentType);
  const objectKey = `testimonies/${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const uploadUrl = await createPresignedMediaUpload({ objectKey, contentType });

  return NextResponse.json({
    uploadUrl,
    objectKey,
    publicUrl: mediaPublicUrl(objectKey),
    contentType,
  });
}
