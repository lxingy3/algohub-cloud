import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getCurrentUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { hashPassword, hashPasswordResetToken, validatePassword } from '../../../../lib/password';
import { sessionCookieName } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const resetToken = String(payload.resetToken || '');
  if (resetToken) return setPasswordWithResetToken(request, payload, resetToken);

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in.' }, { status: 401 });
  }

  if (user.passwordHash) {
    return NextResponse.json({ error: 'This account already has a password.' }, { status: 409 });
  }

  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const updated = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: null },
    data: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: 'This account already has a password.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

async function setPasswordWithResetToken(request, payload, resetToken) {
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(resetToken);
  const now = new Date();
  const resetCandidate = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { expiresAt: true },
  });
  if (!resetCandidate || resetCandidate.expiresAt <= now) {
    return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sessionToken = randomUUID();

  try {
    await prisma.$transaction(async (tx) => {
      const resetRecord = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true },
      });
      if (!resetRecord) throw new InvalidResetTokenError();

      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          id: resetRecord.id,
          tokenHash,
          expiresAt: { gt: now },
        },
      });
      if (consumed.count !== 1) throw new InvalidResetTokenError();

      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          passwordSetAt: now,
        },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: resetRecord.userId } });
      await tx.session.deleteMany({ where: { userId: resetRecord.userId } });
      await tx.session.create({
        data: {
          sessionToken,
          userId: resetRecord.userId,
          expires,
        },
      });
    });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 });
    }
    throw error;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

class InvalidResetTokenError extends Error {}
