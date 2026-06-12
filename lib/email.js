const resendEndpoint = 'https://api.resend.com/emails';

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM_EMAIL);
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresAt }) {
  if (!isPasswordResetEmailConfigured()) {
    return { sent: false, reason: 'email-not-configured' };
  }

  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.PASSWORD_RESET_FROM_EMAIL,
      to,
      reply_to: process.env.PASSWORD_RESET_REPLY_TO || undefined,
      subject: 'Reset your AlgoStories password',
      html: passwordResetHtml({ resetUrl, expiresAt }),
      text: passwordResetText({ resetUrl, expiresAt }),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('Password reset email failed', response.status, body);
    return { sent: false, reason: 'send-failed' };
  }

  return { sent: true };
}

function passwordResetText({ resetUrl, expiresAt }) {
  return [
    'Reset your AlgoStories password',
    '',
    'Use this link to choose a new password:',
    resetUrl,
    '',
    `This link expires ${formatExpiry(expiresAt)}.`,
    'If you did not request this reset, you can ignore this email.',
  ].join('\n');
}

function passwordResetHtml({ resetUrl, expiresAt }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px">Reset your AlgoStories password</h1>
      <p>Use the button below to choose a new password.</p>
      <p>
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#0f172a;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">
          Reset password
        </a>
      </p>
      <p style="font-size:14px;color:#475569">This link expires ${escapeHtml(formatExpiry(expiresAt))}.</p>
      <p style="font-size:14px;color:#475569">If you did not request this reset, you can ignore this email.</p>
    </div>
  `;
}

function formatExpiry(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
