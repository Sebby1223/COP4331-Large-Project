// Sends a sample verification email, to check deliverability before the real flow exists.
// Usage: pnpm --filter @cop4331/api mail:test you@gmail.com
// Try a Gmail and a UCF address, and check spam. Uses RESEND_API_KEY / MAIL_FROM / APP_URL from the root .env.
import { sendVerificationEmail } from '../src/mail.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: pnpm --filter @cop4331/api mail:test <email>');
  process.exit(1);
}

await sendVerificationEmail(to, 'test-token-not-real');
console.log(`Sent test verification email to ${to}`);
