import { describe, expect, it } from 'vitest';
import { csrfCookieUrl, getApiError } from './api';

describe('getApiError', () => {
  it('maps Laravel validation errors to field messages', () => {
    const info = getApiError({
      response: {
        status: 422,
        data: {
          message: 'Dữ liệu không hợp lệ.',
          errors: { email: ['Email đã tồn tại.'], password: ['Mật khẩu quá ngắn.'] },
        },
      },
    });

    expect(info.fields.email).toBe('Email đã tồn tại.');
    expect(info.fields.password).toBe('Mật khẩu quá ngắn.');
    expect(info.message).toBe('Email đã tồn tại.');
  });

  it('keeps the server message when there are no field errors', () => {
    const info = getApiError({
      response: { status: 503, data: { message: 'Đăng nhập Google chưa được cấu hình.' } },
    });

    expect(info.message).toBe('Đăng nhập Google chưa được cấu hình.');
    expect(info.fields).toEqual({});
  });

  it('explains network failures instead of throwing', () => {
    const info = getApiError(new Error('Network Error'));

    expect(info.message).toContain('Không thể kết nối tới API backend');
  });
});

describe('csrfCookieUrl', () => {
  it('drops the /api suffix because Sanctum lives at the app root', () => {
    expect(csrfCookieUrl('http://localhost:8000/api')).toBe(
      'http://localhost:8000/sanctum/csrf-cookie'
    );
  });

  it('keeps an API root without /api untouched', () => {
    expect(csrfCookieUrl('https://api.example.com')).toBe(
      'https://api.example.com/sanctum/csrf-cookie'
    );
  });
});
