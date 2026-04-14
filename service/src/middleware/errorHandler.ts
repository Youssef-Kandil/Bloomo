import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/lib/http-error';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Validation failed', details: err.flatten() },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  const message = err instanceof Error ? err.message : 'Internal error';
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
}
