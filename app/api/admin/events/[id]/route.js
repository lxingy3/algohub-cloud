import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const eventTypes = new Set(['WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER']);

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
      data: eventPayload(formData),
    });
  }
  return NextResponse.redirect(new URL('/admin/events', request.url), { status: 303 });
}

function eventPayload(formData) {
  const eventType = String(formData.get('eventType') || 'OTHER');
  const maxAttendees = String(formData.get('maxAttendees') || '').trim();
  return {
    title: String(formData.get('title') || '').trim(),
    description: emptyToNull(formData.get('description')),
    eventType: eventTypes.has(eventType) ? eventType : 'OTHER',
    date: new Date(String(formData.get('date') || new Date().toISOString())),
    endDate: dateOrNull(formData.get('endDate')),
    location: emptyToNull(formData.get('location')),
    isVirtual: formData.get('isVirtual') === 'on',
    virtualLink: emptyToNull(formData.get('virtualLink')),
    organizerOrgId: emptyToNull(formData.get('organizerOrgId')),
    maxAttendees: maxAttendees ? Number(maxAttendees) : null,
    registrationRequired: formData.get('registrationRequired') === 'on',
    registrationUrl: emptyToNull(formData.get('registrationUrl')),
    imageUrl: emptyToNull(formData.get('imageUrl')),
  };
}

function emptyToNull(value) {
  const text = String(value || '').trim();
  return text || null;
}

function dateOrNull(value) {
  const text = String(value || '').trim();
  return text ? new Date(text) : null;
}
