import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { AuthMode } from '../../types/auth';
import { AuthTabs } from './AuthTabs';
import { FastAuthButtons } from './FastAuthButtons';
import { InputField } from './InputField';
import { api, endpoints, getApiError } from '../../lib/api';
import { useLogin, useRegister } from '../../lib/auth';
import { wasRemembered } from '../../lib/token';

const loginSchema = z.object({
  email: z.email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên của bạn'),
    email: z.email('Email không đúng định dạng'),
    password: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự'),
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const login = useLogin();
  const register = useRegister();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: wasRemembered() },
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
    loginForm.clearErrors();
    registerForm.clearErrors();
  };

  const submitLogin = loginForm.handleSubmit(async (values) => {
    setGeneralError(null);

    try {
      await login.mutateAsync({
        email: values.email,
        password: values.password,
        remember: values.rememberMe,
      });
      navigate('/coach', { replace: true });
    } catch (error) {
      const info = getApiError(error);

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

    try {
      await register.mutateAsync({
        name: values.fullName,
        email: values.email,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });
      navigate('/coach', { replace: true });
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
    <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
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

      <FastAuthButtons
        isLoading={googleLoading}
        onGoogleClick={async () => {
          setGeneralError(null);
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

      <div className="relative flex items-center justify-center mb-6">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
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
            placeholder="Tối thiểu 8 ký tự"
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
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
                Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật học tập của
                SkillBridge.
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
              className="w-full py-3 px-4 rounded-xl bg-[#002045] hover:bg-[#00132b] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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
                  <span>Tạo tài khoản &amp; Bắt đầu học</span>
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-slate-500">
        <span>
          {isLogin ? 'Bạn chưa có tài khoản SkillBridge?' : 'Đã có tài khoản SkillBridge?'}
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
