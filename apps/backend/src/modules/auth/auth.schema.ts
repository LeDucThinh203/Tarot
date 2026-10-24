import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Địa chỉ email chưa đúng.').max(254, 'Email không được quá 254 ký tự.'),
  username: z.string().trim().toLowerCase().min(3, 'Tên đăng nhập cần ít nhất 3 ký tự.').max(24, 'Tên đăng nhập không được quá 24 ký tự.')
    .regex(/^[a-z0-9][a-z0-9._-]{1,22}[a-z0-9]$/, 'Tên đăng nhập cần bắt đầu và kết thúc bằng chữ hoặc số.')
    .refine((value) => !/[._-]{2}/.test(value), 'Không dùng dấu câu liên tiếp trong tên đăng nhập.')
    .refine((value) => !['admin', 'administrator', 'guest', 'support', 'system'].includes(value), 'Tên đăng nhập này chưa thể sử dụng.'),
  password: z.string().min(10, 'Mật khẩu cần ít nhất 10 ký tự.').max(72, 'Mật khẩu không được quá 72 ký tự.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Mật khẩu hơi dài, bạn rút gọn một chút nhé.'),
  displayName: z.string().trim().min(2, 'Tên hiển thị cần ít nhất 2 ký tự.').max(100, 'Tên hiển thị không được quá 100 ký tự.')
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Tên hiển thị chứa ký tự không hợp lệ.'),
}).strict();
const identifierSchema = z.string().trim().toLowerCase().min(3).max(254).refine((value) => {
  if (value.includes('@')) return z.string().email().safeParse(value).success;
  return /^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(value);
}, 'Hãy nhập email hoặc tên đăng nhập hợp lệ.');
export const loginSchema = z.object({
  identifier: identifierSchema.optional(),
  email: z.string().trim().toLowerCase().email('Địa chỉ email chưa đúng.').max(254, 'Email không được quá 254 ký tự.').optional(),
  password: z.string().min(1).max(72),
}).strict().refine((value) => Boolean(value.identifier || value.email), { path: ['identifier'], message: 'Hãy nhập email hoặc tên đăng nhập.' })
  .transform((value) => ({ identifier: value.identifier ?? value.email!, password: value.password }));
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
