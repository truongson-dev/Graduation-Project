import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
  .regex(/[a-z]/, 'Mật khẩu phải có chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu phải có chữ hoa')
  .regex(/[0-9]/, 'Mật khẩu phải có chữ số')
  .regex(/[\p{S}\p{P}]/u, 'Mật khẩu phải có ký tự đặc biệt');

export const PASSWORD_REQUIREMENTS =
  '8–72 ký tự, gồm chữ hoa, chữ thường, số và ít nhất một ký tự đặc biệt.';
