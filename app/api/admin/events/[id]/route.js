import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  if (formData.get('action') === 'delete') {
    await prisma.communityEvent.delete({ where: { id } });
  } else {
    await prisma.communityEvent.update({
      where: { id },
      data: {
        title: String(formData.get('title') || ''),
        date: new Date(String(formData.get('date') || new Date().toISOString())),
      },
    });
  }
  return NextResponse.redirect(new URL('/admin/events', request.url), { status: 303 });
}
