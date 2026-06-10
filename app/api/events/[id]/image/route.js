import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { mediaRedirectResponse } from '../../../../../lib/mediaStorage';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const event = await prisma.communityEvent.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: { imageUrl: true },
  });

  if (!event?.imageUrl) {
    return NextResponse.json({ error: 'Event image not found' }, { status: 404 });
  }

  return mediaRedirectResponse({
    request,
    mediaUrl: event.imageUrl,
    cacheControl: 'public, max-age=300',
  });
}
