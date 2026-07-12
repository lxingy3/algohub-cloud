import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, jurisdictionId: admin.jurisdictionId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const formData = await request.formData();
  const action = String(formData.get('action') || '');
  if (action !== 'update-profile') return NextResponse.json({ error: 'Unknown user action.' }, { status: 400 });
  const name = String(formData.get('name') || '').trim();
  const organizationId = String(formData.get('organizationId') || '').trim();
  if (name.length < 2 || name.length > 255) return NextResponse.json({ error: 'Name must be between 2 and 255 characters.' }, { status: 400 });
  if (organizationId) {
    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, jurisdictionId: admin.jurisdictionId, isActive: true },
      select: { id: true },
    });
    if (!organization) return NextResponse.json({ error: 'Organization not found.' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id },
    data: { name, organizationId: organizationId || null },
  });
  return NextResponse.json({ updated: true });
}
