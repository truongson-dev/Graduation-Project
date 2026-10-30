import { describe, expect, it, beforeEach } from 'vitest';
import { clearToken, readRefreshToken, readToken, saveToken, saveTokenPair, wasRemembered } from './token';

describe('token storage', () => {
  beforeEach(() => {
    clearToken();
  });

  it('keeps a remembered token in localStorage', () => {
    saveToken('abc', true);

    expect(readToken()).toBe('abc');
    expect(localStorage.getItem('softskill_token')).toBe('abc');
    expect(sessionStorage.getItem('softskill_token')).toBeNull();
    expect(wasRemembered()).toBe(true);
  });

  it('keeps a non-remembered token in sessionStorage', () => {
    saveToken('xyz', false);

    expect(readToken()).toBe('xyz');
    expect(localStorage.getItem('softskill_token')).toBeNull();
    expect(sessionStorage.getItem('softskill_token')).toBe('xyz');
  });

  it('clearToken removes the token from both stores', () => {
    saveToken('abc', true);
    saveToken('xyz', false);

    clearToken();

    expect(readToken()).toBeNull();
    expect(wasRemembered()).toBe(false);
  });

  it('stores and clears the refresh token alongside the access token', () => {
    saveTokenPair('access', 'refresh', false);

    expect(readRefreshToken()).toBe('refresh');
    expect(sessionStorage.getItem('softskill_refresh_token')).toBe('refresh');
    expect(localStorage.getItem('softskill_refresh_token')).toBeNull();

    clearToken();
    expect(readRefreshToken()).toBeNull();
  });
});
