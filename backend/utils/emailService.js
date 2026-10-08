import nodemailer from 'nodemailer';

/**
 * Clean email service abstraction for Rent Ease.
 * Supports live SMTP delivery when configured via environment variables,
 * with a secure developer fallback for local testing.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes = 30 }) {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || '"Rent Ease" <no-reply@rentease.com>';
  const isDev = process.env.NODE_ENV !== 'production';

  const isConfigured = Boolean(host && user && pass);

  if (isConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const textContent = `Hello ${name || 'User'},

You requested to reset your Rent Ease password.

Reset Password:
${resetUrl}

This link expires in ${expiresInMinutes} minutes.

If you did not request this, you can safely ignore this email. Your password will not change.

Best regards,
The Rent Ease Team`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .brand { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
    .brand span { color: #2563eb; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 9999px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .note { font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; }
    .url { word-break: break-all; color: #2563eb; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Rent<span>Ease</span></div>
    <h2 style="margin-top: 0; font-size: 20px;">Password Reset Request</h2>
    <p>Hello ${name ? `<strong>${name}</strong>` : 'there'},</p>
    <p>We received a request to reset the password for your Rent Ease account. Click the button below to choose a new password:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p style="font-size: 13px; color: #64748b;">This password reset link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once.</p>
    <div class="note">
      <p style="margin-top: 0;">If you did not request a password reset, you can safely ignore this email. No changes will be made to your account.</p>
      <p style="margin-bottom: 0;">Button not working? Copy and paste this link into your browser:<br><span class="url">${resetUrl}</span></p>
    </div>
  </div>
</body>
</html>`;

      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Reset your Rent Ease password',
        text: textContent,
        html: htmlContent,
      });

      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err) {
      console.error('Failed to send reset email via SMTP:', err.message);
      if (!isDev) {
        return { success: false, error: 'Email delivery failed' };
      }
    }
  }

  // Safe development fallback: log URL to console only in non-production mode
  if (isDev) {
    console.log('\n======================================================================');
    console.log('[DEVELOPMENT ONLY] RENT EASE PASSWORD RESET LINK:');
    console.log(`Recipient:       ${to}`);
    console.log(`Expires in:      ${expiresInMinutes} minutes`);
    console.log(`Reset URL:       ${resetUrl}`);
    console.log('Notice:          This link was generated locally because SMTP is unconfigured.');
    console.log('                 In production, valid EMAIL_* environment variables are required.');
    console.log('======================================================================\n');
    return { success: true, delivered: false, devResetUrl: resetUrl };
  }

  return { success: false, error: 'Email service is not configured in production.' };
}
