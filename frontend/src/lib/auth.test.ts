import { beforeEach, describe, expect, it } from 'vitest';
import { consumeGoogleCallbackError, consumeGoogleCallbackToken } from './auth';
import { clearToken, readToken } from './token';

describe('consumeGoogleCallbackToken', () => {
  beforeEach(() => {
    clearToken();
    window.history.replaceState({}, '', '/auth/callback');
  });

  it('stores the token from the URL fragment and scrubs it', () => {
    window.history.replaceState({}, '', '/auth/callback#token=abc123&refresh_token=refresh123&token_type=Bearer');

    expect(consumeGoogleCallbackToken()).toBe('abc123');
    expect(readToken()).toBe('abc123');
    expect(window.location.hash).toBe('');
  });

  it('returns null when the fragment has no token', () => {
    window.history.replaceState({}, '', '/auth/callback');

    expect(consumeGoogleCallbackToken()).toBeNull();
    expect(readToken()).toBeNull();
  });

  it('returns a provider cancellation message and scrubs the fragment', () => {
    window.history.replaceState({}, '', '/auth/callback#error=cancelled&message=Bạn+đã+huỷ+đăng+nhập+Google.');

    expect(consumeGoogleCallbackError()).toBe('Bạn đã huỷ đăng nhập Google.');
    expect(window.location.hash).toBe('');
  });
});
