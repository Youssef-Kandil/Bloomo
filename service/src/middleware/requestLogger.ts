import type { NextFunction, Request, Response } from 'express';

import { env } from '@/config/env';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    // eslint-disable-next-line no-console
    console.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
}
