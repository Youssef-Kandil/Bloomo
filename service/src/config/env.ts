import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url().or(z.string().startsWith('mysql://')),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('24h'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  // Leave unset (or use the default empty string) to let cookies bind to the
  // request host — necessary when accessing the dev server over a LAN IP
  // since a hardcoded "localhost" Domain attribute would be rejected.
  COOKIE_DOMAIN: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Bloomo <no-reply@bloomo.local>'),

  WHATSAPP_PROVIDER: z.enum(['cloud', 'web', 'stub']).default('cloud'),

  // --- Cloud API (Meta) ---
  WHATSAPP_API_VERSION: z.string().default('v21.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // --- Common queue throttling (anti-flood) ---
  WHATSAPP_SESSION_DIR: z.string().default('./.wa-sessions'),
  WHATSAPP_DAILY_CAP_DEFAULT: z.coerce.number().int().positive().default(300),
  WHATSAPP_MIN_DELAY_MS: z.coerce.number().int().positive().default(1000),
  WHATSAPP_MAX_DELAY_MS: z.coerce.number().int().positive().default(3000),
  LOCATION_FRESHNESS_MIN: z.coerce.number().int().positive().default(5),
  START_TASK_RADIUS_M: z.coerce.number().int().positive().default(200),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
export type Env = typeof env;
