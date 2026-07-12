import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const returnTo = String(formData.get('returnTo') || '/admin/organizations');
  const organization = await prisma.organization.findFirst({
    where: { id, jurisdictionId: admin.jurisdictionId },
    select: { id: true },
  });
  if (!organization) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
  if (formData.get('action') === 'delete') {
    await prisma.organization.delete({ where: { id } });
  } else {
    const approved = formData.get('action') === 'approve';
    await prisma.organization.update({
      where: { id },
      data: {
        name: String(formData.get('name') || ''),
        contactEmail: String(formData.get('contactEmail') || ''),
        role: String(formData.get('role') || '') || null,
        websiteUrl: String(formData.get('websiteUrl') || '') || null,
        logoUrl: String(formData.get('logoUrl') || '') || null,
        description: String(formData.get('description') || '') || null,
        ...(approved ? { isActive: true, role: 'community_partner' } : {}),
      },
    });
  }
  return NextResponse.redirect(new URL(returnTo.startsWith('/admin/organizations') ? returnTo : '/admin/organizations', request.url), { status: 303 });
}
