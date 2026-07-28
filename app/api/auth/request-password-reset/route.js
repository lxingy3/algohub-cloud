import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { createPasswordResetToken, hashPasswordResetToken } from '../../../../lib/password';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from '../../../../lib/email';
import { isSameOriginRequest, publicAppOrigin } from '../../../../lib/requestSecurity';

export const dynamic = 'force-dynamic';
const RESET_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-site password reset requests are not allowed.' }, { status: 403 });
  }

  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const emailConfigured = isPasswordResetEmailConfigured();
  const emailSendingEnabled = process.env.PASSWORD_RESET_EMAIL_ENABLED === 'true';
  const manualResetMessage = 'If an account exists for that email, an admin will generate a reset link and send it to your email.';
  const genericEmailMessage = emailSendingEnabled
    ? 'If an account exists for that email, a password reset email will be sent.'
    : manualResetMessage;

  let user = null;
  if (email) {
    user = await prisma.user.findFirst({
      where: {
        email,
        jurisdictionId: getJurisdictionId(),
      },
      select: { id: true },
    });
  }

  if (user) {
    const recentRequest = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recentRequest) {
      return NextResponse.json({
        ok: true,
        emailConfigured,
        emailSendingEnabled,
        message: genericEmailMessage,
      });
    }

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

    const resetUrl = new URL('/', publicAppOrigin(request));
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
