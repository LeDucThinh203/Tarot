import type { Response } from 'express';

export function success<T>(res: Response, data: T, status = 200, meta: unknown = null): void {
  res.status(status).json({ success: true, data, meta });
}
