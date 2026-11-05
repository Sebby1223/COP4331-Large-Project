import { Resend } from 'resend';
import { env } from './env.js';

if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required in production (see .env.example)');
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Sends through Resend. Without an API key (local dev), prints the email instead so
// register/verify/reset can be tested without one.
export async function sendMail(msg: MailMessage): Promise<void> {
  if (!resend) {
    console.log(`[mail] (not sent, no RESEND_API_KEY)\nto: ${msg.to}\nsubject: ${msg.subject}\n\n${msg.text}\n`);
    return;
  }

  const { error } = await resend.emails.send({ from: env.MAIL_FROM, ...msg });
  if (error) throw new Error(`Email to ${msg.to} failed: ${error.message}`);
}

const link = (path: string, rawToken: string) =>
  `${env.APP_URL}${path}?token=${encodeURIComponent(rawToken)}`;

const layout = (heading: string, body: string, url: string, button: string) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1e293b">
  <h2>${heading}</h2>
  <p>${body}</p>
  <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">${button}</a></p>
  <p style="font-size:12px;color:#64748b">Or paste this link into your browser:<br>${url}</p>
</div>`;

// rawToken is the unhashed token; only its hash is stored in the database
export function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const url = link('/verify-email', rawToken);
  return sendMail({
    to,
    subject: 'Verify your email',
    html: layout('Verify your email', 'Confirm your address to finish signing up. This link expires in 24 hours.', url, 'Verify email'),
    text: `Confirm your address to finish signing up (expires in 24 hours):\n${url}`,
  });
}

export function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const url = link('/reset-password', rawToken);
  return sendMail({
    to,
    subject: 'Reset your password',
    html: layout(
      'Reset your password',
      "Someone asked to reset your password. This link works once and expires in 1 hour. If it wasn't you, ignore this email.",
      url,
      'Reset password',
    ),
    text: `Reset your password (works once, expires in 1 hour):\n${url}\n\nIf it wasn't you, ignore this email.`,
  });
}
