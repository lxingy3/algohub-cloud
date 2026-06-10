import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../../lib/jurisdiction';
import { mediaRedirectResponse } from '../../../../../../lib/mediaStorage';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id, kind } = await params;
  if (kind !== 'audio' && kind !== 'video') {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 });
  }

  const testimony = await prisma.testimony.findFirst({
    where: {
      id,
      jurisdictionId: getJurisdictionId(),
      moderationStatus: 'APPROVED',
    },
    select: { audioFileUrl: true, videoFileUrl: true, mediaObjectKey: true, mediaStorageProvider: true },
  });

  if (!testimony) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  const mediaUrl = kind === 'audio' ? testimony.audioFileUrl : testimony.videoFileUrl;
  if (!mediaUrl) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  return mediaRedirectResponse({
    request,
    mediaUrl,
    objectKey: testimony.mediaStorageProvider === 'firebase-gcs' ? testimony.mediaObjectKey : null,
    cacheControl: 'public, max-age=0, must-revalidate',
  });
}
