import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

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
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

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
