import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { AuthMode } from '../types/auth';
import { AuthTabs } from './AuthTabs';
import { FastAuthButtons } from './FastAuthButtons';
import { InputField } from './InputField';
import { api, endpoints, getApiError } from '@/core/api/client';
import { useLogin, useRegister } from '../api/auth';
import { PASSWORD_REQUIREMENTS, passwordSchema } from '@/core/utils/password';

const loginSchema = z.object({
  email: z.email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên của bạn'),
    email: z.email('Email không đúng định dạng'),
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    agreeTerms: z
      .boolean()
      .refine((agreed) => agreed, 'Bạn cần đồng ý với điều khoản dịch vụ để tiếp tục'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Mật khẩu nhập lại không khớp',
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

interface AuthFormProps {
  onForgotPassword?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onForgotPassword }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(null);
  const [loginLockoutSeconds, setLoginLockoutSeconds] = useState(0);

  const login = useLogin();
  const register = useRegister();

  useEffect(() => {
    if (loginLockoutUntil === null) {
      setLoginLockoutSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((loginLockoutUntil - Date.now()) / 1000));
      setLoginLockoutSeconds(remaining);
      if (remaining === 0) setLoginLockoutUntil(null);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [loginLockoutUntil]);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      agreeTerms: false,
    },
  });

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setGeneralError(null);
    setSuccessMessage(null);
    loginForm.clearErrors();
    registerForm.clearErrors();
  };

  const submitLogin = loginForm.handleSubmit(async (values) => {
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      await login.mutateAsync({
        email: values.email,
        password: values.password,
        remember: values.rememberMe,
      });
      setLoginLockoutUntil(null);
      navigate('/home', { replace: true });
    } catch (error) {
      const info = getApiError(error);

      if (info.status === 423) {
        setLoginLockoutUntil(Date.now() + (info.retryAfterSeconds ?? 900) * 1000);
      }

      if (info.fields.email) {
        loginForm.setError('email', { message: info.fields.email });
      }
      if (info.fields.password) {
        loginForm.setError('password', { message: info.fields.password });
      }

      setGeneralError(info.message);
    }
  });

  const submitRegister = registerForm.handleSubmit(async (values) => {
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      await register.mutateAsync({
        name: values.fullName,
        email: values.email,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });
      registerForm.reset();
      loginForm.setValue('email', values.email, { shouldValidate: true });
      loginForm.setValue('password', '');
      setMode('login');
      setSuccessMessage('Tạo tài khoản thành công. Hãy đăng nhập bằng tài khoản vừa tạo.');
    } catch (error) {
      const info = getApiError(error);

      if (info.fields.name) {
        registerForm.setError('fullName', { message: info.fields.name });
      }
      if (info.fields.email) {
        registerForm.setError('email', { message: info.fields.email });
      }
      if (info.fields.password) {
        registerForm.setError('password', { message: info.fields.password });
      }
      if (info.fields.password_confirmation) {
        registerForm.setError('passwordConfirmation', {
          message: info.fields.password_confirmation,
        });
      }

      setGeneralError(info.message);
    }
  });

  const isLoading = login.isPending || register.isPending;
  const isLogin = mode === 'login';

  const loginValues = loginForm.watch();
  const registerValues = registerForm.watch();

  return (
    <div className="auth-form p-5 sm:p-7 flex flex-col justify-center">
      <AuthTabs currentMode={mode} onChangeMode={handleModeChange} />

      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#002045]">
          {isLogin ? 'Mừng bạn quay lại!' : 'Tạo tài khoản học tập'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isLogin
            ? 'Vui lòng đăng nhập để tiếp tục lộ trình rèn luyện kỹ năng mềm của bạn.'
            : 'Tạo tài khoản để bắt đầu lộ trình rèn luyện kỹ năng mềm của bạn.'}
        </p>
      </div>

      {generalError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2.5">
          <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
          <span>{generalError}</span>
        </div>
      )}

      {isLogin && loginLockoutSeconds > 0 && (
        <p role="status" className="-mt-2 mb-4 text-xs font-medium text-amber-700">
          Có thể thử đăng nhập lại sau {Math.floor(loginLockoutSeconds / 60)} phút{' '}
          {String(loginLockoutSeconds % 60).padStart(2, '0')} giây.
        </p>
      )}

      {successMessage && (
        <div role="status" className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      <FastAuthButtons
        isLoading={googleLoading}
        onGoogleClick={async () => {
          setGeneralError(null);
          setSuccessMessage(null);
          setGoogleLoading(true);

          try {
            // The API answers with a JSON authorization URL, not a 302.
            const response = await api.get<{ data: { url: string } }>(
              endpoints.auth.googleRedirect
            );
            window.location.href = response.data.data.url;
          } catch (error) {
            setGeneralError(getApiError(error).message);
            setGoogleLoading(false);
          }
        }}
      />

      <div className="relative flex items-center justify-center mb-5">
        <div className="auth-divider-line w-full" />
        <span className="auth-divider-label px-3 text-[11px] uppercase tracking-wider font-semibold absolute">
          hoặc với tài khoản
        </span>
      </div>

      {isLogin ? (
        <form onSubmit={submitLogin} className="space-y-4" noValidate>
          <InputField
            id="login-email"
            label="Địa chỉ Email"
            type="email"
            icon="mail"
            placeholder="student@university.edu.vn"
            value={loginValues.email}
            onChange={(event) =>
              loginForm.setValue('email', event.target.value, { shouldValidate: true })
            }
            error={loginForm.formState.errors.email?.message}
            autoComplete="email"
          />

          <InputField
            id="login-password"
            label="Mật khẩu"
            type="password"
            icon="lock"
            placeholder="Nhập mật khẩu"
            value={loginValues.password}
            onChange={(event) =>
              loginForm.setValue('password', event.target.value, { shouldValidate: true })
            }
            error={loginForm.formState.errors.password?.message}
            autoComplete="current-password"
            headerRightAction={
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-[#1a365d] hover:text-[#002045] hover:underline transition cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            }
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="remember-check"
                type="checkbox"
                checked={loginValues.rememberMe}
                onChange={(event) =>
                  loginForm.setValue('rememberMe', event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-[#002045] focus:ring-[#002045] accent-[#002045] cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">
                Ghi nhớ đăng nhập trên thiết bị này
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || loginLockoutSeconds > 0}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-700/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang xử lý...</span>
                </span>
              ) : (
                <>
                  <span>Đăng nhập ngay</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitRegister} className="space-y-4" noValidate>
          <InputField
            id="register-fullname"
            label="Họ và tên sinh viên"
            type="text"
            icon="person"
            placeholder="Nguyễn Văn A"
            value={registerValues.fullName}
            onChange={(event) =>
              registerForm.setValue('fullName', event.target.value, { shouldValidate: true })
            }
            error={registerForm.formState.errors.fullName?.message}
            autoComplete="name"
          />

          <InputField
            id="register-email"
            label="Địa chỉ Email"
            type="email"
            icon="mail"
            placeholder="student@university.edu.vn"
            value={registerValues.email}
            onChange={(event) =>
              registerForm.setValue('email', event.target.value, { shouldValidate: true })
            }
            error={registerForm.formState.errors.email?.message}
            autoComplete="email"
          />

          <InputField
            id="register-password"
            label="Mật khẩu"
            type="password"
            icon="lock"
            placeholder="Tối thiểu 8 ký tự"
            value={registerValues.password}
            onChange={(event) =>
              registerForm.setValue('password', event.target.value, { shouldValidate: true })
            }
            error={registerForm.formState.errors.password?.message}
            helperText={PASSWORD_REQUIREMENTS}
            autoComplete="new-password"
          />

          <InputField
            id="register-password-confirmation"
            label="Nhập lại mật khẩu"
            type="password"
            icon="lock_reset"
            placeholder="Nhập lại mật khẩu vừa tạo"
            value={registerValues.passwordConfirmation}
            onChange={(event) =>
              registerForm.setValue('passwordConfirmation', event.target.value, {
                shouldValidate: true,
              })
            }
            error={registerForm.formState.errors.passwordConfirmation?.message}
            autoComplete="new-password"
          />

          <div>
            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms-check"
                type="checkbox"
                checked={registerValues.agreeTerms}
                onChange={(event) =>
                  registerForm.setValue('agreeTerms', event.target.checked, {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#002045] focus:ring-[#002045] accent-[#002045] shrink-0 cursor-pointer"
              />
              <label
                htmlFor="terms-check"
                className="text-xs text-slate-500 leading-snug cursor-pointer select-none"
              >
                Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật học tập.
              </label>
            </div>
            {registerForm.formState.errors.agreeTerms?.message && (
              <p className="text-xs text-red-500 mt-1">
                {registerForm.formState.errors.agreeTerms.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-700/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang xử lý...</span>
                </span>
              ) : (
                <>
                  <span>Tạo tài khoản</span>
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-slate-500">
        <span>
          {isLogin ? 'Bạn chưa có tài khoản?' : 'Đã có tài khoản?'}
        </span>
        <button
          type="button"
          onClick={() => handleModeChange(isLogin ? 'register' : 'login')}
          className="ml-1 text-[#1a365d] hover:text-[#002045] font-bold underline transition cursor-pointer"
        >
          {isLogin ? 'Đăng ký tài khoản miễn phí' : 'Đăng nhập tại đây'}
        </button>
      </div>
    </div>
  );
};
