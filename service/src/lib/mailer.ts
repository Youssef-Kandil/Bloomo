import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '@/config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' }
      : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    if (env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[mailer:dev] to=${to} subject=${subject}\n${html}`);
    }
    return;
  }
  await tx.sendMail({ from: env.SMTP_FROM, to, subject, html });
}
