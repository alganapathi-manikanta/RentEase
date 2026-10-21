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
  const rawFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM || '';
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const isDev = process.env.NODE_ENV !== 'production';

  // For Resend: if no custom verified from-address is provided, use Resend's default sender domain
  const resendFrom = rawFrom && !rawFrom.includes('@rentease.com')
    ? (rawFrom.includes('<') ? rawFrom : `"Rent Ease" <${rawFrom}>`)
    : '"Rent Ease" <onboarding@resend.dev>';

  // Standard from-address for SMTP and Brevo
  const from = rawFrom || '"Rent Ease" <no-reply@rentease.com>';

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

  const maskEmail = (str) => {
    if (!str || typeof str !== 'string') return 'unknown';
    return str.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  };

  // 1. Resend API delivery if configured
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          subject: 'Reset your Rent Ease password',
          html: htmlContent,
          text: textContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          delivered: true,
          provider: 'resend',
          messageId: data.id,
          status: 'accepted',
        };
      }
      const sanitizedError =
        data?.message ||
        data?.error?.message ||
        (typeof data === 'string' ? data : 'Resend API rejected request');
      console.error(
        `[EMAIL SERVICE] Resend rejected reset email to ${maskEmail(to)}: [Status ${res.status}] ${sanitizedError}`
      );
      return {
        success: false,
        delivered: false,
        provider: 'resend',
        error: sanitizedError,
        statusCode: res.status,
      };
    } catch (err) {
      console.error('[EMAIL SERVICE] Resend delivery network exception:', err.message);
      return {
        success: false,
        delivered: false,
        provider: 'resend',
        error: err.message,
      };
    }
  }

  // 2. Brevo API delivery if configured
  if (brevoApiKey) {
    try {
      const senderMatch = from.match(/<([^>]+)>/);
      const senderEmail = senderMatch
        ? senderMatch[1]
        : (process.env.EMAIL_FROM_ADDRESS || 'no-reply@rentease.com');
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Rent Ease', email: senderEmail },
          to: [{ email: to, name: name || 'User' }],
          subject: 'Reset your Rent Ease password',
          htmlContent: htmlContent,
          textContent: textContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          delivered: true,
          provider: 'brevo',
          messageId: data.messageId,
          status: 'accepted',
        };
      }
      const sanitizedError =
        data?.message || data?.code || (typeof data === 'string' ? data : 'Brevo API rejected request');
      console.error(
        `[EMAIL SERVICE] Brevo rejected reset email to ${maskEmail(to)}: [Status ${res.status}] ${sanitizedError}`
      );
      return {
        success: false,
        delivered: false,
        provider: 'brevo',
        error: sanitizedError,
        statusCode: res.status,
      };
    } catch (err) {
      console.error('[EMAIL SERVICE] Brevo delivery network exception:', err.message);
      return {
        success: false,
        delivered: false,
        provider: 'brevo',
        error: err.message,
      };
    }
  }

  // 3. SMTP delivery if configured via environment
  const isSmtpConfigured = Boolean(host && user && pass);
  if (isSmtpConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Reset your Rent Ease password',
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        delivered: true,
        provider: 'smtp',
        messageId: info.messageId,
        status: 'accepted',
      };
    } catch (err) {
      console.error(
        `[EMAIL SERVICE] SMTP delivery failed to ${maskEmail(to)}:`,
        err.message
      );
      return {
        success: false,
        delivered: false,
        provider: 'smtp',
        error: err.message,
        code: err.code,
      };
    }
  }

  // 4. Safe development fallback: log URL to console only in non-production mode
  if (isDev) {
    console.log('\n======================================================================');
    console.log('[DEVELOPMENT ONLY] RENT EASE PASSWORD RESET LINK:');
    console.log(`Recipient:       ${to}`);
    console.log(`Expires in:      ${expiresInMinutes} minutes`);
    console.log(`Reset URL:       ${resetUrl}`);
    console.log('Notice:          This link was generated locally because email provider is unconfigured.');
    console.log('                 In production, configure RESEND_API_KEY, BREVO_API_KEY, or EMAIL_* variables.');
    console.log('======================================================================\n');
    return { success: true, delivered: false, provider: 'dev-console', devResetUrl: resetUrl };
  }

  return {
    success: false,
    delivered: false,
    provider: 'none',
    error: 'No email delivery provider is configured in production (RESEND_API_KEY, BREVO_API_KEY, or SMTP credentials missing).',
  };
}

/**
 * Returns safe diagnostic information about the configured email provider.
 * NEVER leaks passwords, API keys, or raw tokens.
 */
export function getEmailServiceStatus() {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasBrevo = Boolean(process.env.BREVO_API_KEY?.trim());
  const hasSmtp = Boolean(
    process.env.EMAIL_HOST?.trim() &&
    process.env.EMAIL_USER?.trim() &&
    process.env.EMAIL_PASSWORD?.trim()
  );

  let activeProvider = 'none';
  if (hasResend) activeProvider = 'resend';
  else if (hasBrevo) activeProvider = 'brevo';
  else if (hasSmtp) activeProvider = 'smtp';
  else if (process.env.NODE_ENV !== 'production') activeProvider = 'dev-console';

  const rawFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM || '';
  const maskedSender = rawFrom
    ? rawFrom.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : (hasResend ? 'onboarding@resend.dev (default)' : 'not configured');

  return {
    configured: activeProvider !== 'none',
    activeProvider,
    hasResendKey: hasResend,
    hasBrevoKey: hasBrevo,
    hasSmtpConfig: hasSmtp,
    senderAddress: maskedSender,
    environment: process.env.NODE_ENV || 'development',
  };
}
