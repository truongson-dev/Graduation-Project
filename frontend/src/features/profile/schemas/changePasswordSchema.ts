import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.'),
    new_password_confirmation: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['new_password_confirmation'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
