import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPassword } from '../api/auth';
import { getApiError } from '@/core/api/client';

const forgotSchema = z.object({
  email: z.email('Email không đúng định dạng'),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export const ForgotPasswordForm: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const forgot = useForgotPassword();

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);

    try {
      await forgot.mutateAsync({ email: values.email });
      setSent(true);
    } catch (error) {
      setGeneralError(getApiError(error).message);
    }
  });

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">mark_email_read</span>
          <span>
            Nếu email này đã đăng ký, hệ thống đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư
            (cả mục Spam).
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p>
        Nhập địa chỉ email đăng ký của bạn. Hệ thống sẽ gửi một liên kết xác thực để đặt lại mật khẩu
        mới.
      </p>

      {generalError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {generalError}
        </div>
      )}

      <input
        type="email"
        autoComplete="email"
        placeholder="email@example.com"
        value={form.watch('email')}
        onChange={(event) =>
          form.setValue('email', event.target.value, { shouldValidate: true })
        }
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
      />

      {form.formState.errors.email?.message && (
        <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
      )}

      <button
        type="submit"
        disabled={forgot.isPending}
        className="w-full py-2.5 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white font-semibold text-sm cursor-pointer transition shadow-sm disabled:opacity-70"
      >
        {forgot.isPending ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
      </button>
    </form>
  );
};
