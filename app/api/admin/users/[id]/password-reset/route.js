import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';
import { createPasswordResetToken, hashPasswordResetToken } from '../../../../../../lib/password';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.jurisdictionId !== admin.jurisdictionId) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: 'This user has not set a password yet.' }, { status: 400 });
  }

  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const resetUrl = new URL('/', request.url);
  resetUrl.searchParams.set('authModal', 'reset-password');
  resetUrl.searchParams.set('resetToken', token);

  return NextResponse.json({
    resetUrl: resetUrl.toString(),
    expiresAt: expiresAt.toISOString(),
  });
}
