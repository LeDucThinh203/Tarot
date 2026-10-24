import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { AppError } from '../../common/errors.js';
import { authenticate } from '../../common/middleware.js';
import { success } from '../../common/response.js';
import { validate } from '../../common/validate.js';
import * as service from './readings.service.js';
import { createReadingSchema, idempotencyKeySchema, listReadingsSchema, readingChatSchema, readingIdSchema } from './readings.schema.js';
import { getInterpretation, interpretReading } from './interpretation.service.js';
import * as chatService from './chat.service.js';

export const readingsRouter = Router();
readingsRouter.use(authenticate);

readingsRouter.post('/', validate(createReadingSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createReadingSchema>;
  const headerKey = req.header('Idempotency-Key');
  const parsedHeaderKey = headerKey ? idempotencyKeySchema.safeParse(headerKey) : undefined;
  if (parsedHeaderKey && !parsedHeaderKey.success) throw new AppError(400, 'VALIDATION_ERROR', 'Idempotency key must be a valid UUID.', parsedHeaderKey.error.issues);
  const input = { ...body, ...(parsedHeaderKey?.success ? { idempotencyKey: parsedHeaderKey.data } : {}) };
  const reading = await service.createReading(req.user!.id, input);
  success(res, reading, 201);
}));
readingsRouter.get('/', validate(listReadingsSchema, 'query'), asyncHandler(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof listReadingsSchema>;
  const result = await service.listReadings(req.user!.id, query.page, query.limit, query.search);
  success(res, result.items, 200, result.meta);
}));
readingsRouter.post('/:id/interpretation', validate(readingIdSchema, 'params'), asyncHandler(async (req, res) => {
  const result = await interpretReading(req.user!.id, String(req.params.id));
  success(res, result);
}));
readingsRouter.get('/:id/interpretation', validate(readingIdSchema, 'params'), asyncHandler(async (req, res) => {
  success(res, await getInterpretation(req.user!.id, String(req.params.id)));
}));
readingsRouter.get('/:id/chat', validate(readingIdSchema, 'params'), asyncHandler(async (req, res) => {
  success(res, await chatService.getChatHistory(req.user!.id, String(req.params.id)));
}));
readingsRouter.post('/:id/chat', validate(readingIdSchema, 'params'), validate(readingChatSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof readingChatSchema>;
  success(res, await chatService.sendChatMessage(req.user!.id, String(req.params.id), body.content, req.user!.isGuest), 201);
}));
readingsRouter.get('/:id', validate(readingIdSchema, 'params'), asyncHandler(async (req, res) => {
  success(res, await service.getReading(req.user!.id, String(req.params.id)));
}));
readingsRouter.delete('/:id', validate(readingIdSchema, 'params'), asyncHandler(async (req, res) => {
  await service.deleteReading(req.user!.id, String(req.params.id));
  success(res, { deleted: true });
}));
