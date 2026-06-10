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
  const returnTo = String(formData.get('returnTo') || '/admin/comments');
  const status = String(formData.get('status') || 'PENDING').toUpperCase();
  const comment = await prisma.comment.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: { moderationStatus: true },
  });

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  if (!isModerationStatus(status) || !canModerateTo(comment.moderationStatus, status)) {
    return NextResponse.json({ error: 'This moderation transition is not allowed.' }, { status: 400 });
  }

  await prisma.comment.update({
    where: { id },
    data: { moderationStatus: status },
  });

  return NextResponse.redirect(new URL(returnTo.startsWith('/admin/comments') ? returnTo : '/admin/comments', request.url), { status: 303 });
}
