import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '../api/schema';
import { api, endpoints, getApiError } from './api';
import { clearToken, readToken, saveTokenPair } from './token';

export type AuthUser = components['schemas']['UserResource'];
export type ForgotPasswordInput = components['schemas']['ForgotPasswordRequest'];
export type ResetPasswordInput = components['schemas']['ResetPasswordRequest'];

const ME_QUERY_KEY = ['auth', 'me'] as const;

export interface TokenPair {
  token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

interface AuthEnvelope {
  data: { user: AuthUser } & Partial<TokenPair>;
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

/** Current session, cached for a minute; disabled when no token exists. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: readToken() !== null,
    retry: false,
    staleTime: 60_000,
  });
}

function storeSession(response: { data: AuthEnvelope }, remember: boolean): AuthUser {
  const payload = response.data.data;

  if (!payload.token || !payload.refresh_token) {
    throw new Error('Máy chủ không trả về đủ thông tin phiên đăng nhập.');
  }

  saveTokenPair(payload.token, payload.refresh_token, remember);

  return payload.user;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await api.post<AuthEnvelope>(endpoints.auth.login, {
        email: input.email,
        password: input.password,
        device_name: 'web',
      });

      return storeSession(response, input.remember);
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
      clearToken();
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post(endpoints.auth.logout);
      } finally {
        clearToken();
      }
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
      clearToken();
      queryClient.clear();
    },
  });
}

/**
 * Read the token that the Google callback appends to the URL fragment.
 * The fragment never reaches the server, and it is scrubbed from history.
 */
export function consumeGoogleCallbackToken(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('token');
  const refreshToken = params.get('refresh_token');

  if (!token || !refreshToken) {
    if (params.has('token') || params.has('error') || params.has('message')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return null;
  }

  saveTokenPair(token, refreshToken, true);
  window.history.replaceState({}, document.title, window.location.pathname);

  return token;
}

export function consumeGoogleCallbackError(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = params.get('error');
  const message = params.get('message');

  if (!error && !message) return null;

  window.history.replaceState({}, document.title, window.location.pathname);

  return message || 'Không thể xác thực với Google. Vui lòng thử lại.';
}

export { getApiError };
