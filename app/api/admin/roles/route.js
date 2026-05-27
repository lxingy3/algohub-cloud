import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim().toUpperCase();
  const description = String(formData.get('description') || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
  }

  await prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });

  return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
}
