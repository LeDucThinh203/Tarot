import type { Request, Response } from 'express';

const mocked = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('./logger.js', () => ({ logger: { error: mocked.error } }));

import { errorHandler } from './error-handler.js';

function makeResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe('central error handler', () => {
  beforeEach(() => mocked.error.mockClear());

  it('returns a safe database unavailable response for connection failures', () => {
    const response = makeResponse();
    const error = Object.assign(new Error('Prisma internals and local paths'), { code: 'ECONNREFUSED' });

    errorHandler(error, {} as Request, response as unknown as Response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ success: false, error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is unavailable. Please try again shortly.',
      details: [],
    } });
    expect(JSON.stringify(response.json.mock.calls[0]?.[0])).not.toContain('Prisma internals');
  });

  it('does not expose unexpected error messages to the client', () => {
    const response = makeResponse();

    errorHandler(new Error('internal stack trace'), {} as Request, response as unknown as Response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(response.json.mock.calls[0]?.[0])).not.toContain('internal stack trace');
  });
});
