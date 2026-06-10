import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { mediaRedirectResponse } from '../../../../../lib/mediaStorage';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;
  const organization = await prisma.organization.findFirst({
    where: { id, jurisdictionId: getJurisdictionId(), isActive: true },
    select: { logoUrl: true },
  });

  if (!organization?.logoUrl) {
    return NextResponse.json({ error: 'Organization logo not found' }, { status: 404 });
  }

  return mediaRedirectResponse({
    request,
    mediaUrl: organization.logoUrl,
    cacheControl: 'public, max-age=300',
  });
}
