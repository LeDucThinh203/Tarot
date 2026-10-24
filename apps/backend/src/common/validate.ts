import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './errors.js';

export function validate<T>(schema: ZodType<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request.', result.error.issues));
      return;
    }
    // Express 5 exposes req.query through a getter, so assignment throws.
    // Define an own validated value so handlers receive Zod's coerced output.
    Object.defineProperty(req, source, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: result.data,
    });
    next();
  };
}
