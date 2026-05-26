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
    await prisma.organization.delete({ where: { id } });
  } else {
    await prisma.organization.update({
      where: { id },
      data: {
        name: String(formData.get('name') || ''),
        contactEmail: String(formData.get('contactEmail') || ''),
      },
    });
  }
  return NextResponse.redirect(new URL('/admin/organizations', request.url), { status: 303 });
}
