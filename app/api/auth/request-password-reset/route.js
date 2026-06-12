import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { normalizeRole } from '../../../../lib/roles';
import { createPasswordResetToken, hashPasswordResetToken } from '../../../../lib/password';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = normalizeRole(formData.get('role'));
  const emailConfigured = isPasswordResetEmailConfigured();
  const genericEmailMessage = 'If an account exists for that email and role, a password reset email will be sent.';

  let user = null;
  if (email) {
    user = await prisma.user.findFirst({
      where: {
        email,
        primaryRoleName: role,
        jurisdictionId: getJurisdictionId(),
      },
      select: { id: true },
    });
  }

  if (!emailConfigured) {
    return NextResponse.json({
      ok: true,
      emailConfigured: false,
      message: 'Email password reset is not configured yet. Please contact an admin to generate a reset link.',
    });
  }

  if (user) {
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
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
    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetUrl: resetUrl.toString(),
      expiresAt,
    });

    if (!emailResult.sent) {
      return NextResponse.json({
        ok: true,
        emailConfigured: true,
        message: 'The reset email could not be sent right now. Please contact an admin to generate a reset link.',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    emailConfigured: true,
    message: genericEmailMessage,
  });
}
