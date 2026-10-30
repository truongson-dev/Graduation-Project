import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { InputField } from '../components/Auth/InputField';
import { getApiError } from '../lib/api';
import { useResetPassword } from '../lib/auth';
import { PASSWORD_REQUIREMENTS, passwordSchema } from '../lib/password';

const MAX_PASSWORD_LENGTH = 72;

/**
 * Landing page of the e-mail reset link: the notification carries the token and
 * the e-mail as query parameters, see ResetPasswordNotification.
 */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = useResetPassword();
  const linkIsValid = token !== '' && email !== '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.issues[0]?.message ?? 'Mật khẩu chưa đáp ứng yêu cầu.');
      return;
    }

    if (password !== confirmation) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      await reset.mutateAsync({
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setDone(true);
    } catch (submitError) {
      setError(getApiError(submitError).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/70 p-8">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <span className="material-symbols-outlined text-[#1a365d] text-[24px]">
            lock_reset
          </span>
          <h1 className="font-bold text-slate-800 text-lg">Đặt lại mật khẩu</h1>
        </div>

        {!linkIsValid && (
          <div className="pt-4 space-y-3 text-sm text-slate-600">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
              <span>Liên kết không hợp lệ: thiếu mã xác thực hoặc email.</span>
            </div>
            <p>
              Hãy yêu cầu một liên kết mới từ màn hình đăng nhập, trong mục “Quên mật
              khẩu?”.
            </p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#002045] text-white text-sm font-semibold"
            >
              Về trang đăng nhập
            </Link>
          </div>
        )}

        {linkIsValid && done && (
          <div className="pt-4 space-y-3 text-sm text-slate-600">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                check_circle
              </span>
              <span>Mật khẩu đã được cập nhật. Hãy đăng nhập lại bằng mật khẩu mới.</span>
            </div>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#002045] text-white text-sm font-semibold"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {linkIsValid && !done && (
          <form onSubmit={submit} className="pt-4 space-y-4" noValidate>
            <p className="text-xs text-slate-500">
              Đặt mật khẩu mới cho <strong className="text-slate-700">{email}</strong>.
            </p>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                <span className="material-symbols-outlined text-red-600 text-[20px]">
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            <InputField
              id="reset-password"
              label="Mật khẩu mới"
              type="password"
              icon="lock"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
              autoComplete="new-password"
              helperText={PASSWORD_REQUIREMENTS}
            />

            <InputField
              id="reset-password-confirmation"
              label="Nhập lại mật khẩu mới"
              type="password"
              icon="lock_reset"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={reset.isPending}
              className="w-full py-3 px-4 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {reset.isPending ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Cập nhật mật khẩu</span>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Liên kết trong email hết hạn sau 60 phút.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
