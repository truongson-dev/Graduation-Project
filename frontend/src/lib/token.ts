/** localStorage key that holds the Sanctum personal access token. */
export const TOKEN_KEY = 'softskill_token';

/** Remember-me flag; localStorage survives the browser restart, sessionStorage does not. */
const REMEMBER_KEY = 'softskill_remember';

/** Token is read from both stores so a tab opened later can still find it. */
export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string, remember: boolean): void {
  clearToken();
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function wasRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}
