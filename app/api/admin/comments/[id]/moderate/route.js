import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get('returnTo') || '/admin/comments');
  await prisma.comment.update({
    where: { id },
    data: { moderationStatus: String(formData.get('status') || 'PENDING') },
  });

  return NextResponse.redirect(new URL(returnTo.startsWith('/admin/comments') ? returnTo : '/admin/comments', request.url), { status: 303 });
}
