import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const status = String(formData.get('status') || 'PENDING');

  await prisma.testimony.update({
    where: { id },
    data: {
      moderationStatus: status,
      moderatorId: admin.id,
      moderationNotes: String(formData.get('notes') || ''),
    },
  });

  return NextResponse.redirect(new URL('/admin/testimonies', request.url), { status: 303 });
}
