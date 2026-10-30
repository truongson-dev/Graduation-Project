/** localStorage key that holds the Sanctum personal access token. */
export const TOKEN_KEY = 'softskill_token';
export const REFRESH_TOKEN_KEY = 'softskill_refresh_token';

/** Remember-me flag; localStorage survives the browser restart, sessionStorage does not. */
const REMEMBER_KEY = 'softskill_remember';

/** Token is read from both stores so a tab opened later can still find it. */
export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string, remember: boolean): void {
  saveTokenPair(token, null, remember);
}

export function saveTokenPair(token: string, refreshToken: string | null, remember: boolean): void {
  clearToken();
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function readRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function wasRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}
