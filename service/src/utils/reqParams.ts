import type { Request } from 'express';

import { AppError } from '@/lib/http-error';

/**
 * Express 5 typings model `req.params[key]` as `string | string[]`. All our
 * routes use scalar params, so coerce to a single string and 400 if missing.
 */
export function param(req: Request, key: string): string {
  const v = req.params?.[key];
  if (typeof v === 'string' && v.length > 0) return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  throw AppError.badRequest(`Missing route param "${key}"`);
}
