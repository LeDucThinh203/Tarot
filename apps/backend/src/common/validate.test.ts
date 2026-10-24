import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from './validate.js';

describe('request validation middleware', () => {
  it('replaces Express 5 query getter with the parsed and coerced values', () => {
    const req = Object.create({ get query() { return { page: '3' }; } }) as Request;
    const next = vi.fn();

    validate(z.object({ page: z.coerce.number().int() }), 'query')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 3 });
  });
});
