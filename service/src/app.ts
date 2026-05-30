import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { UPLOAD_DIR } from '@/lib/uploads';

import { authRouter } from '@/auth/auth.routes';
import { requireAuth } from '@/auth/auth.middleware';
import { env } from '@/config/env';
import { attendanceRouter } from '@/features/attendance/attendance.routes';
import { clientsRouter } from '@/features/clients/clients.routes';
import { companiesRouter } from '@/features/companies/companies.routes';
import { inventoryRouter } from '@/features/inventory/inventory.routes';
import { logsRouter } from '@/features/logs/logs.routes';
import { leaveRouter } from '@/features/leave/leave.routes';
import { offDayRouter } from '@/features/offday/offday.routes';
import { overtimeRouter } from '@/features/overtime/overtime.routes';
import { payrollRouter } from '@/features/payroll/payroll.routes';
import { salaryAdvanceRouter } from '@/features/salary-advance/salary-advance.routes';
import { permissionsRouter } from '@/features/permissions/permissions.routes';
import { rankingRouter } from '@/features/ranking/ranking.routes';
import { subscriptionRouter } from '@/features/subscription/subscription.routes';
import { systemRouter } from '@/features/system/system.routes';
import { ratingsRouter } from '@/features/ratings/ratings.routes';
import { requestsRouter } from '@/features/requests/requests.routes';
import { supplyRouter } from '@/features/supply/supply.routes';
import { tasksRouter } from '@/features/tasks/tasks.routes';
import { toolsRouter } from '@/features/tools/tools.routes';
import { trackingRouter } from '@/features/tracking/tracking.routes';
import { treasuryRouter } from '@/features/treasury/treasury.routes';
import { usersRouter } from '@/features/users/users.routes';
import { whatsappRouter } from '@/features/whatsapp/whatsapp.routes';
import { whatsappWebhookRouter } from '@/features/whatsapp/whatsapp.webhook';
import { auditLogger } from '@/middleware/audit';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  // CORS allow-list:
  //   - The configured FRONTEND_ORIGIN (production / staging).
  //   - In development only: any LAN/loopback origin (localhost,
  //     127.0.0.1, RFC1918 ranges) so the app works when accessed
  //     over the dev machine's IP from a phone on the same network.
  //   - Requests with no Origin header (curl, server-to-server) are allowed.
  const lanOriginRegex =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/u;
  const isDev = env.NODE_ENV !== 'production';
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (origin === env.FRONTEND_ORIGIN) return cb(null, true);
        if (isDev && lanOriginRegex.test(origin)) return cb(null, true);
        // Log the rejection in dev so the user can see why their phone gets
        // CORS errors (these never appear in the request logger because they
        // fail at the OPTIONS preflight stage, before any handler runs).
        if (isDev) {
          // eslint-disable-next-line no-console
          console.warn(`[CORS] Rejected origin: ${origin}`);
        }
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // User-uploaded files (voice notes, etc). Cached aggressively because the
  // filenames are random — content is effectively immutable per URL.
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => res.set('Cache-Control', 'public, max-age=2592000, immutable'),
    }),
  );

  app.use('/auth', authRouter);

  // Meta Cloud API webhook (no auth — Meta calls it directly).
  app.use('/webhooks/whatsapp', whatsappWebhookRouter);

  // All feature routers require authentication.
  const api = express.Router();
  api.use(requireAuth, auditLogger);
  api.use('/companies', companiesRouter);
  api.use('/users', usersRouter);
  api.use('/permissions', permissionsRouter);
  api.use('/clients', clientsRouter);
  api.use('/tools', toolsRouter);
  api.use('/inventory', inventoryRouter);
  api.use('/supply', supplyRouter);
  api.use('/requests', requestsRouter);
  api.use('/ranking', rankingRouter);
  api.use('/subscription', subscriptionRouter);
  api.use('/system', systemRouter);
  api.use('/tasks', tasksRouter);
  api.use('/attendance', attendanceRouter);
  api.use('/off-day-requests', offDayRouter);
  api.use('/overtime-requests', overtimeRouter);
  api.use('/leave-requests', leaveRouter);
  api.use('/salary-advances', salaryAdvanceRouter);
  api.use('/payroll', payrollRouter);
  api.use('/treasury', treasuryRouter);
  api.use('/ratings', ratingsRouter);
  api.use('/tracking', trackingRouter);
  api.use('/whatsapp', whatsappRouter);
  api.use('/logs', logsRouter);

  app.use('/api', api);

  app.use(errorHandler);

  return app;
}
