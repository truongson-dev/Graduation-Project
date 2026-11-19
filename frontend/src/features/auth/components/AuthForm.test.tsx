import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authLib from '../api/auth';
import { AuthForm } from './AuthForm';

vi.mock('@/core/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  endpoints: {
    auth: {
      googleRedirect: '/auth/google/redirect',
    },
  },
  getApiError: (err: any) => ({
    message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra',
    fields: err?.response?.data?.errors || {},
    status: err?.response?.status,
  }),
}));

describe('AuthForm', () => {
  let queryClient: QueryClient;
  const mockLoginMutateAsync = vi.fn();
  const mockRegisterMutateAsync = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(authLib, 'useLogin').mockReturnValue({
      mutateAsync: mockLoginMutateAsync,
      isPending: false,
    } as any);

    vi.spyOn(authLib, 'useRegister').mockReturnValue({
      mutateAsync: mockRegisterMutateAsync,
      isPending: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderAuthForm = (props: { onForgotPassword?: () => void } = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthForm {...props} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders login form by default with email and password inputs', () => {
    renderAuthForm();

    expect(screen.getByRole('heading', { level: 2, name: /mừng bạn quay lại/i })).toBeTruthy();
    expect(screen.getByLabelText(/địa chỉ email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /đăng nhập ngay/i })).toBeTruthy();
  });

  it('shows zod validation errors on empty login submission', async () => {
    renderAuthForm();

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập ngay/i }));

    expect(await screen.findByText(/vui lòng nhập địa chỉ email/i)).toBeTruthy();
    expect(await screen.findByText(/vui lòng nhập mật khẩu/i)).toBeTruthy();
    expect(mockLoginMutateAsync).not.toHaveBeenCalled();
  });

  it('shows zod validation error for invalid email in login', async () => {
    renderAuthForm();

    fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
      target: { value: 'invalid-email-format' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'SomePass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập ngay/i }));

    expect(await screen.findByText(/email không đúng định dạng/i)).toBeTruthy();
    expect(mockLoginMutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid login data with react-hook-form', async () => {
    mockLoginMutateAsync.mockResolvedValueOnce({ data: { user: { id: 1 } } });
    renderAuthForm();

    fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
      target: { value: 'student@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'ValidPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập ngay/i }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'ValidPass123!',
        remember: false,
      });
    });
  });

  it('switches to register tab and validates required fields with zod', async () => {
    renderAuthForm();

    // Switch to register tab
    fireEvent.click(screen.getByRole('tab', { name: /đăng ký mới/i }));

    expect(screen.getByRole('heading', { level: 2, name: /tạo tài khoản học tập/i })).toBeTruthy();
    expect(screen.getByLabelText(/họ và tên sinh viên/i)).toBeTruthy();
    expect(screen.getByLabelText(/nhập lại mật khẩu/i)).toBeTruthy();

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    expect(await screen.findByText(/vui lòng nhập họ và tên của bạn/i)).toBeTruthy();
    expect(await screen.findByText(/vui lòng nhập địa chỉ email/i)).toBeTruthy();
    expect(await screen.findByText(/bạn cần đồng ý với điều khoản dịch vụ để tiếp tục/i)).toBeTruthy();
    expect(mockRegisterMutateAsync).not.toHaveBeenCalled();
  });

  it('validates password complexity and confirmation match in register', async () => {
    renderAuthForm();

    fireEvent.click(screen.getByRole('tab', { name: /đăng ký mới/i }));

    fireEvent.change(screen.getByLabelText(/họ và tên sinh viên/i), {
      target: { value: 'Nguyễn Văn B' },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
      target: { value: 'nguyenvanb@example.com' },
    });
    // Weak password without uppercase/special char
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'weakpass' },
    });
    fireEvent.change(screen.getByLabelText(/nhập lại mật khẩu/i), {
      target: { value: 'weakpass' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /tôi đồng ý với điều khoản dịch vụ/i }));

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    // Should fail passwordSchema complexity
    expect(await screen.findByText(/mật khẩu phải có tối thiểu 8 ký tự|mật khẩu phải có chữ hoa|mật khẩu phải có ký tự đặc biệt/i)).toBeTruthy();

    // Now test mismatch
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.change(screen.getByLabelText(/nhập lại mật khẩu/i), {
      target: { value: 'DifferentPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));
    expect(await screen.findByText(/mật khẩu nhập lại không khớp/i)).toBeTruthy();
    expect(mockRegisterMutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid registration data and transitions to login mode', async () => {
    mockRegisterMutateAsync.mockResolvedValueOnce({ data: { message: 'Success' } });
    renderAuthForm();

    fireEvent.click(screen.getByRole('tab', { name: /đăng ký mới/i }));

    fireEvent.change(screen.getByLabelText(/họ và tên sinh viên/i), {
      target: { value: 'Nguyễn Văn C' },
    });
    fireEvent.change(screen.getByLabelText(/địa chỉ email/i), {
      target: { value: 'nguyenvanc@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.change(screen.getByLabelText(/nhập lại mật khẩu/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /tôi đồng ý với điều khoản dịch vụ/i }));

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(mockRegisterMutateAsync).toHaveBeenCalledWith({
        name: 'Nguyễn Văn C',
        email: 'nguyenvanc@example.com',
        password: 'SecurePass123!',
        passwordConfirmation: 'SecurePass123!',
      });
    });

    // Should transition to login with success message
    expect(await screen.findByText(/tạo tài khoản thành công/i)).toBeTruthy();
  });
});
