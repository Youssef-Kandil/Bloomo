import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

import { AppError } from '@/lib/http-error';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(AppError.badRequest('Validation failed', result.error.flatten().fieldErrors));
      return;
    }
    // overwrite parsed/coerced data
    (req[source] as unknown) = result.data;
    next();
  };
}
