import { beforeEach, describe, expect, it } from 'vitest';
import { consumeGoogleCallbackCode, consumeGoogleCallbackError } from './auth';

describe('OAuth callback helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/auth/callback');
  });

  it('reads the exchange code from search params and scrubs it', () => {
    window.history.replaceState({}, '', '/auth/callback?code=mock_oauth_exchange_code_123');

    expect(consumeGoogleCallbackCode()).toBe('mock_oauth_exchange_code_123');
    expect(window.location.search).toBe('');
  });

  it('returns null when there is no code in search params', () => {
    window.history.replaceState({}, '', '/auth/callback');

    expect(consumeGoogleCallbackCode()).toBeNull();
  });

  it('returns a provider cancellation message and scrubs the URL fragment', () => {
    window.history.replaceState({}, '', '/auth/callback#error=cancelled&message=Bạn+đã+huỷ+đăng+nhập+Google.');

    expect(consumeGoogleCallbackError()).toBe('Bạn đã huỷ đăng nhập Google.');
    expect(window.location.hash).toBe('');
  });

  it('returns a provider cancellation message from query search params', () => {
    window.history.replaceState({}, '', '/auth/callback?error=cancelled&message=Bạn+đã+huỷ+đăng+nhập+Google.');

    expect(consumeGoogleCallbackError()).toBe('Bạn đã huỷ đăng nhập Google.');
    expect(window.location.search).toBe('');
  });
});
