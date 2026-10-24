import { z } from 'zod';

export const createReadingSchema = z.object({
  querentName: z.string().trim().min(2, 'Hãy nhập tên bạn muốn được gọi.').max(80, 'Tên không được quá 80 ký tự.')
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Tên chứa ký tự không hợp lệ.'),
  querentBirthDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hãy chọn ngày sinh hợp lệ.').refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime())
      && date.toISOString().slice(0, 10) === value
      && value >= '1900-01-01'
      && value <= new Date().toISOString().slice(0, 10);
  }, 'Ngày sinh không hợp lệ.'),
  querentGender: z.enum(['', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  question: z.string().trim().min(8, 'Câu hỏi cần có ít nhất 8 ký tự.').max(1000, 'Câu hỏi không được quá 1.000 ký tự.'),
  topic: z.enum(['LOVE', 'CAREER', 'FINANCE', 'PERSONAL_GROWTH', 'GENERAL']),
  spreadType: z.enum(['ONE_CARD', 'THREE_CARDS', 'FIVE_CARDS']),
  idempotencyKey: z.string().uuid().optional(),
}).strict();
export const idempotencyKeySchema = z.string().uuid();
export const readingIdSchema = z.object({ id: z.string().uuid() }).strict();
export const readingChatSchema = z.object({ content: z.string().trim().min(2, 'Câu hỏi tiếp theo cần có ít nhất 2 ký tự.').max(1200, 'Câu hỏi không được quá 1.200 ký tự.') }).strict();
export const listReadingsSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100, 'Từ khóa không được quá 100 ký tự.').optional(),
}).strict();
export type CreateReadingInput = z.infer<typeof createReadingSchema>;
