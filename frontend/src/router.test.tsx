import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routes } from './router';

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return router;
}

afterEach(() => {
  cleanup();
});

describe('router', () => {
  it('renders the login screen at /', () => {
    renderAt('/');

    expect(screen.getByRole('tab', { name: /đăng nhập/i })).toBeTruthy();
    expect(screen.getByLabelText('Địa chỉ Email')).toBeTruthy();
    expect(screen.getByLabelText('Mật khẩu')).toBeTruthy();
  });

  it('switches to the registration tab', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('tab', { name: /đăng ký mới/i }));

    expect(await screen.findByLabelText('Họ và tên sinh viên')).toBeTruthy();
    expect(screen.getByLabelText('Nhập lại mật khẩu')).toBeTruthy();
  });

  it('redirects /coach to the login screen when there is no authenticated session', async () => {
    const router = renderAt('/coach');

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByLabelText('Địa chỉ Email')).toBeTruthy();
  });

  it('renders the reset password form carried by the e-mail link', () => {
    renderAt('/reset-password?token=abc123&email=student%40university.edu.vn');

    expect(screen.getByLabelText('Mật khẩu mới')).toBeTruthy();
    expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toBeTruthy();
    expect(screen.queryByLabelText('Địa chỉ Email')).toBeNull();
  });

  it('explains a reset link that is missing its token', () => {
    renderAt('/reset-password');

    expect(screen.getByText(/Liên kết không hợp lệ/i)).toBeTruthy();
  });
});
