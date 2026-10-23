import { beforeEach, describe, expect, it } from 'vitest';
import { consumeGoogleCallbackToken } from './auth';
import { clearToken, readToken } from './token';

describe('consumeGoogleCallbackToken', () => {
  beforeEach(() => {
    clearToken();
    window.history.replaceState({}, '', '/auth/callback');
  });

  it('stores the token from the URL fragment and scrubs it', () => {
    window.history.replaceState({}, '', '/auth/callback#token=abc123&token_type=Bearer');

    expect(consumeGoogleCallbackToken()).toBe('abc123');
    expect(readToken()).toBe('abc123');
    expect(window.location.hash).toBe('');
  });

  it('returns null when the fragment has no token', () => {
    window.history.replaceState({}, '', '/auth/callback');

    expect(consumeGoogleCallbackToken()).toBeNull();
    expect(readToken()).toBeNull();
  });
});
