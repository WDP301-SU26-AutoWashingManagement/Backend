import { env } from '../../configs/env.config';
import { logger } from './logger';

/**
 * Gửi email qua Brevo REST API (HTTP, port 443) thay vì SMTP (port 587/465).
 *
 * Lý do đổi: Render/Railway free tier chặn outbound SMTP port, nên nodemailer
 * kết nối SMTP trực tiếp sẽ timeout/fail khi deploy. Gọi HTTP API thì không bị chặn.
 *
 * Giữ nguyên chữ ký sendEmail(to, subject, html) như cũ — toàn bộ nơi gọi
 * (auth, password reset OTP, schedule notification, retry-cron alert) không cần sửa gì.
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!env.BREVO_API_KEY) {
    logger.error('[email] BREVO_API_KEY chưa được cấu hình — không gửi được email');
    throw new Error('Email service is not configured');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`[email] Brevo send failed: ${res.status} ${errText}`);
    throw new Error(`Failed to send email (Brevo ${res.status})`);
  }
};
