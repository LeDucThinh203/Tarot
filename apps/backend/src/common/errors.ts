export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') => new AppError(400, code, message);
export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.');
export const notFound = (message = 'Resource not found.') => new AppError(404, 'NOT_FOUND', message);
