import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const roleId = String(formData.get('roleId') || '');

  await prisma.userRole.deleteMany({ where: { userId: id } });
  if (roleId) {
    await prisma.userRole.create({ data: { userId: id, roleId } });
  }

  return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
}
