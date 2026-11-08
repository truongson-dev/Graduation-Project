import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/core/api/schema';
import { api, endpoints, getApiError } from '@/core/api/client';

export type AuthUser = components['schemas']['UserResource'];
export type ForgotPasswordInput = components['schemas']['ForgotPasswordRequest'];
export type ResetPasswordInput = components['schemas']['ResetPasswordRequest'];

const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthEnvelope {
  data: { user: AuthUser };
}

export interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

async function fetchMe(): Promise<AuthUser> {
  const response = await api.get<{ data: AuthUser }>(endpoints.auth.me);

  return response.data.data;
}

/** Current session, cached for a minute; authenticated via Sanctum session cookie. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await api.post<AuthEnvelope>(endpoints.auth.login, {
        email: input.email,
        password: input.password,
        remember: input.remember,
      });

      return response.data.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useSocialExchange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post<AuthEnvelope>(endpoints.auth.socialExchange, {
        code,
      });

      return response.data.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const response = await api.post<{ data: { user: AuthUser } }>(endpoints.auth.register, {
        name: input.name,
        email: input.email,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
        login_after_registration: false,
      });

      return response.data.data.user;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post(endpoints.auth.logout);
    },
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      await api.post(endpoints.auth.forgotPassword, input);
    },
  });
}

/** Consume the reset link: token and email arrive as query parameters. */
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const response = await api.post<{ message: string }>(
        endpoints.auth.resetPassword,
        input
      );

      return response.data.message;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function consumeGoogleCallbackCode(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  if (code) {
    searchParams.delete('code');
    const newSearch = searchParams.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
    return code;
  }

  return null;
}

export function consumeGoogleCallbackError(): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  const error = hashParams.get('error') ?? searchParams.get('error');
  const message = hashParams.get('message') ?? searchParams.get('message');

  if (!error && !message) return null;

  window.history.replaceState({}, document.title, window.location.pathname);

  return message || 'Không thể xác thực với Google. Vui lòng thử lại.';
}

export { getApiError };
