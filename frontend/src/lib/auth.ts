import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '../api/schema';
import { api, endpoints, getApiError } from './api';
import { clearToken, readToken, saveToken } from './token';

export type AuthUser = components['schemas']['UserResource'];
export type ForgotPasswordInput = components['schemas']['ForgotPasswordRequest'];
export type ResetPasswordInput = components['schemas']['ResetPasswordRequest'];

const ME_QUERY_KEY = ['auth', 'me'] as const;

interface AuthEnvelope {
  data: { user: AuthUser; token?: string };
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

  if (!payload.token) {
    throw new Error('Máy chủ không trả về token đăng nhập.');
  }

  saveToken(payload.token, remember);

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
      const response = await api.post<AuthEnvelope>(endpoints.auth.register, {
        name: input.name,
        email: input.email,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
        device_name: 'web',
      });

      return storeSession(response, true);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
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

  if (!token) return null;

  saveToken(token, true);
  window.history.replaceState({}, document.title, window.location.pathname);

  return token;
}

export { getApiError };
