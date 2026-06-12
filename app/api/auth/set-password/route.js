import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { hashPassword, validatePassword } from '../../../../lib/password';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in.' }, { status: 401 });
  }

  if (user.passwordHash) {
    return NextResponse.json({ error: 'This account already has a password.' }, { status: 409 });
  }

  const payload = await request.json().catch(() => ({}));
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
