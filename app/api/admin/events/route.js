import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const formData = await request.formData();
  await prisma.communityEvent.create({
    data: {
      jurisdictionId: getJurisdictionId(),
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || ''),
      location: String(formData.get('location') || ''),
      date: new Date(String(formData.get('date') || new Date().toISOString())),
      registrationUrl: String(formData.get('registrationUrl') || ''),
    },
  });

  return NextResponse.redirect(new URL('/admin/events', request.url), { status: 303 });
}
