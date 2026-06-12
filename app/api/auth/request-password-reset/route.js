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
  const emailSendingEnabled = process.env.PASSWORD_RESET_EMAIL_ENABLED === 'true';
  const manualResetMessage = 'If an account exists for that email and role, an admin will generate a reset link and send it to your email.';
  const genericEmailMessage = emailSendingEnabled
    ? 'If an account exists for that email and role, a password reset email will be sent.'
    : manualResetMessage;

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

    if (!emailSendingEnabled) {
      return NextResponse.json({
        ok: true,
        emailConfigured,
        emailSendingEnabled: false,
        message: manualResetMessage,
      });
    }

    if (!emailConfigured) {
      return NextResponse.json({
        ok: true,
        emailConfigured: false,
        emailSendingEnabled: true,
        message: manualResetMessage,
      });
    }

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
        emailSendingEnabled: true,
        message: 'The reset email could not be sent right now. Please contact an admin to generate a reset link.',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    emailConfigured,
    emailSendingEnabled,
    message: genericEmailMessage,
  });
}
