import axios from 'axios';
import { env } from '../config/env';

/** Root of the backend API, without the version segment. */
export const API_ROOT = env.VITE_API_URL.replace(/\/+$/, '');

/** Version segment of backend/routes/api.php. */
export const API_VERSION = env.VITE_API_VERSION;

/** Full base URL that axios prepends to every relative request path. */
export const API_BASE_URL = `${API_ROOT}/${API_VERSION}`;

/** Every backend route, relative to API_BASE_URL. Mirrors backend/routes/api.php. */
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: (id: string | number, hash: string) => `/auth/email/verify/${id}/${hash}`,
    resendVerification: '/auth/email/verification-notification',
    googleRedirect: '/auth/social/google/redirect',
    googleCallback: '/auth/social/google/callback',
    socialExchange: '/auth/social/exchange',
    refresh: '/auth/refresh',
  },
  ai: {
    chat: '/ai/chat',
    feedback: '/ai/feedback',
    conversations: '/ai/conversations',
    conversationMessages: (conversationId: string | number) =>
      `/ai/conversations/${conversationId}/messages`,
    presentationEvaluate: '/ai/presentation/evaluate',
  },
  presentation: {
    sessions: '/presentation/sessions',
    session: (id: string) => `/presentation/sessions/${id}`,
    retry: (id: string) => `/presentation/sessions/${id}/retry`,
    audio: (id: string) => `/presentation/sessions/${id}/audio`,
  },
} as const;

/** Build an absolute backend URL for full-page navigations that bypass axios. */
export function apiUrl(path = ''): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Sanctum registers its cookie route at the application root
 * (`sanctum/csrf-cookie`), not under `/api`. VITE_API_URL is documented as
 * APP_URL + `/api`, so strip that suffix to reach the application root.
 */
export function csrfCookieUrl(apiRoot: string): string {
  return `${apiRoot.replace(/\/api$/, '')}/sanctum/csrf-cookie`;
}

const CSRF_COOKIE_URL = csrfCookieUrl(API_ROOT);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
});

let csrfBootstrap: Promise<unknown> | null = null;

/** Fetch the XSRF cookie pair when it is missing; deduplicate parallel writes. */
export function ensureCsrfCookie(force = false): Promise<unknown> {
  if (!force && document.cookie.includes('XSRF-TOKEN=')) {
    return Promise.resolve();
  }

  csrfBootstrap ??= axios
    .get(CSRF_COOKIE_URL, { withCredentials: true })
    .catch((error) => {
      // Never cache a failed handshake, the next write has to retry it.
      csrfBootstrap = null;
      throw error;
    });

  return csrfBootstrap;
}

/** Read one cookie by name; used to echo XSRF-TOKEN on raw fetch requests. */
export function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const row = document.cookie.split('; ').find((item) => item.startsWith(prefix));

  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

/** Bootstrap the CSRF cookie before non-idempotent writes. */
api.interceptors.request.use(async (config) => {
  const method = (config.method ?? 'get').toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
  }

  return config;
});

/** Refresh a stale CSRF pair once if Sanctum returns 419. */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as
      | { __csrfRetried?: boolean; url?: string; headers?: Record<string, unknown> }
      | undefined;

    if (error?.response?.status === 419 && config && !config.__csrfRetried) {
      config.__csrfRetried = true;
      csrfBootstrap = null;
      await ensureCsrfCookie(true);
      return api.request(error.config);
    }

    return Promise.reject(error);
  }
);

export interface ApiErrorInfo {
  message: string;
  fields: Record<string, string>;
  status?: number;
  retryAfterSeconds?: number;
}

/** Turn any thrown request error into a user-safe message plus field errors. */
export function getApiError(
  error: unknown,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'
): ApiErrorInfo {
  const axiosError = error as {
    response?: {
      status?: number;
      headers?: Record<string, string | undefined>;
      data?: { message?: string; errors?: Record<string, string[]>; retry_after_seconds?: number };
    };
  };

  if (!axiosError?.response) {
    return {
      message: `Không thể kết nối tới API backend tại ${API_BASE_URL}. Hãy chắc chắn backend đang chạy (php artisan serve) và CORS đã cho phép origin này.`,
      fields: {},
    };
  }

  const { data } = axiosError.response;

  const fields: Record<string, string> = {};
  for (const [field, messages] of Object.entries(data?.errors ?? {})) {
    if (messages[0]) fields[field] = messages[0];
  }

  return {
    message: Object.values(fields)[0] ?? data?.message ?? fallback,
    fields,
    status: axiosError.response.status,
    retryAfterSeconds: Number(axiosError.response.headers?.['retry-after'] ?? data?.retry_after_seconds) || undefined,
  };
}
