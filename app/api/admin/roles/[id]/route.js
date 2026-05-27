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
    await prisma.userRole.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
  }

  const name = String(formData.get('name') || '').trim().toUpperCase();
  const description = String(formData.get('description') || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
  }

  await prisma.role.update({
    where: { id },
    data: { name, description },
  });

  return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
}
