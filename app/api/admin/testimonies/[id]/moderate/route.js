import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../../lib/jurisdiction';
import { canModerateTo, isModerationStatus } from '../../../../../../lib/moderation';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const status = String(formData.get('status') || 'PENDING').toUpperCase();
  const returnTo = String(formData.get('returnTo') || '/admin/testimonies');
  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: { moderationStatus: true },
  });

  if (!testimony) return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
  if (!isModerationStatus(status) || !canModerateTo(testimony.moderationStatus, status)) {
    return NextResponse.json({ error: 'This moderation transition is not allowed.' }, { status: 400 });
  }

  await prisma.testimony.update({
    where: { id },
    data: {
      moderationStatus: status,
      moderatorId: admin.id,
      moderationNotes: String(formData.get('notes') || ''),
    },
  });

  return NextResponse.redirect(new URL(returnTo.startsWith('/admin/testimonies') ? returnTo : '/admin/testimonies', request.url), { status: 303 });
}
