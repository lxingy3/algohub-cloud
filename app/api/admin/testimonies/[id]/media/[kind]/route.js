import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

function mediaResponse(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;

  const [, contentType, payload] = match;
  const buffer = Buffer.from(payload, 'base64');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}

export async function GET(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id, kind } = await params;
  if (kind !== 'audio' && kind !== 'video') {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 });
  }

  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: { audioFileUrl: true, videoFileUrl: true },
  });

  if (!testimony) {
    return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
  }

  const mediaUrl = kind === 'audio' ? testimony.audioFileUrl : testimony.videoFileUrl;
  if (!mediaUrl) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  if (mediaUrl.startsWith('data:')) {
    const response = mediaResponse(mediaUrl);
    if (response) return response;
    return NextResponse.json({ error: 'Media could not be read' }, { status: 500 });
  }

  return NextResponse.redirect(new URL(mediaUrl, request.url));
}
