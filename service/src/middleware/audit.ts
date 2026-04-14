import type { NextFunction, Request, Response } from 'express';

import { prisma } from '@/config/prisma';

/**
 * Records a lightweight audit entry for authenticated mutating requests.
 * Skipped on idempotent methods to limit noise.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating || !req.user) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    void prisma.auditLog
      .create({
        data: {
          userId: req.user?.id ?? null,
          action: `${req.method} ${req.baseUrl ?? ''}${req.path}`,
          target: typeof req.params?.id === 'string' ? req.params.id : null,
          meta: undefined,
          ip: req.ip ?? null,
          ua:
            typeof req.headers['user-agent'] === 'string'
              ? req.headers['user-agent'].slice(0, 500)
              : null,
        },
      })
      .catch(() => {
        /* audit failure must not affect the response */
      });
  });

  next();
}
