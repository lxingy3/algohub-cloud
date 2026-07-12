import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';
import { prisma } from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
});

export async function POST(request, { params }) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid name and email address.' }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await registerForEvent({ eventId: id, ...parsed.data });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: result.alreadyRegistered ? 200 : 201 });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }
    console.error('Event registration failed', error);
    return NextResponse.json({ error: 'Registration could not be completed. Try again.' }, { status: 500 });
  }
}

async function registerForEvent({ eventId, name, email }) {
  const jurisdictionId = getJurisdictionId();
  return prisma.$transaction(async (tx) => {
    const event = await tx.communityEvent.findFirst({
      where: { id: eventId, jurisdictionId },
      select: { id: true, title: true, date: true, maxAttendees: true, registrationRequired: true },
    });
    if (!event) return { error: 'Event not found.', status: 404 };
    if (!event.registrationRequired) return { error: 'This event does not require registration.', status: 400 };
    if (event.date <= new Date()) return { error: 'Registration for this event has closed.', status: 409 };

    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_email: { eventId, email } },
      select: { id: true },
    });
    if (existing) return { ok: true, alreadyRegistered: true, eventTitle: event.title };

    if (event.maxAttendees) {
      const registrations = await tx.eventRegistration.count({ where: { eventId } });
      if (registrations >= event.maxAttendees) return { error: 'This event is full.', status: 409 };
    }

    await tx.eventRegistration.create({ data: { jurisdictionId, eventId, name, email } });
    return { ok: true, alreadyRegistered: false, eventTitle: event.title };
  }, { isolationLevel: 'Serializable' });
}
