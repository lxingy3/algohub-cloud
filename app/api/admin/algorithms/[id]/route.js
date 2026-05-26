import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'update');

  if (action === 'delete') {
    await prisma.algorithm.delete({ where: { id } });
  } else {
    await prisma.algorithm.update({
      where: { id },
      data: {
        name: String(formData.get('name') || '').trim(),
        description: String(formData.get('description') || ''),
      },
    });
  }

  return NextResponse.redirect(new URL('/admin/algorithms', request.url), { status: 303 });
}
