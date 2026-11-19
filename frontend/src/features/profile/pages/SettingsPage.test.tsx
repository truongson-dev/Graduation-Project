import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as authLib from '@/features/auth/api/auth';
import { apiClient } from '@/core/api/client';
import type { UserProfileData } from '../types/profile';
import { SettingsPage } from './SettingsPage';

vi.mock('@/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  endpoints: {
    profile: {
      me: '/profile/me',
      update: '/profile',
      avatarUpload: '/profile/avatar',
      avatarDelete: '/profile/avatar',
      updatePassword: '/profile/password',
      show: (id: number | string) => `/profile/${id}`,
    },
    community: {
      userFollow: (userId: number | string) => `/community/users/${userId}/follow`,
    },
  },
  getApiError: (err: any) => ({
    message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra',
    fields: {},
  }),
}));

const mockProfile: UserProfileData = {
  user: {
    id: 1,
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2026-01-15T08:00:00Z',
  },
  community_profile: {
    username: 'nguyenvana',
    headline: 'Sinh viên CNTT',
    bio: 'I own a computer.',
  },
  stats: {
    presentation_count: 5,
    average_score: 8.0,
    practice_duration_minutes: 60,
    followers_count: 10,
    following_count: 5,
  },
  achievements: [],
  posts: [],
  is_own_profile: true,
};

describe('SettingsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: {
        id: 1,
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        email_verified_at: '2026-01-15T08:00:00Z',
        created_at: '2026-01-15T08:00:00Z',
        updated_at: '2026-01-15T08:00:00Z',
      },
      isLoading: false,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof authLib.useMe>);

    vi.spyOn(authLib, 'useLogout').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof authLib.useLogout>);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderSettingsPage = (initialEntry = '/settings') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  it('renders Settings header and all navigation tabs', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });

    renderSettingsPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })).toBeTruthy();
    expect(
      screen.getByText('Quản lý thông tin tài khoản và tùy chọn cài đặt của bạn.')
    ).toBeTruthy();

    const settingsNav = screen.getByRole('navigation', { name: /các mục cài đặt/i });

    // Verify all 6 tabs in Vietnamese
    expect(within(settingsNav).getByRole('button', { name: /^hồ sơ$/i })).toBeTruthy();
    expect(within(settingsNav).getByRole('button', { name: /^bảo mật$/i })).toBeTruthy();
    expect(within(settingsNav).getByRole('button', { name: /^gói dịch vụ$/i })).toBeTruthy();
    expect(within(settingsNav).getByRole('button', { name: /^giao diện$/i })).toBeTruthy();
    expect(within(settingsNav).getByRole('button', { name: /^thông báo$/i })).toBeTruthy();
    expect(within(settingsNav).getByRole('button', { name: /^hiển thị$/i })).toBeTruthy();
  });

  it('renders profile tab content with prefilled user data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });

    renderSettingsPage();

    expect(await screen.findByRole('button', { name: /tải ảnh lên/i })).toBeTruthy();
    expect(await screen.findByDisplayValue('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByLabelText(/tên người dùng/i)).toHaveProperty('value', 'nguyenvana');
    expect(screen.getByLabelText(/email/i)).toHaveProperty('value', 'nguyenvana@example.com');
    expect(screen.getByLabelText(/tiểu sử/i)).toHaveProperty('value', 'I own a computer.');
    expect(screen.getByRole('button', { name: /cập nhật hồ sơ/i })).toBeTruthy();
  });

  it('switches to Security tab and renders password change form without name, dob, or language fields', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });

    renderSettingsPage();

    const settingsNav = screen.getByRole('navigation', { name: /các mục cài đặt/i });
    const securityTab = await within(settingsNav).findByRole('button', { name: /^bảo mật$/i });
    fireEvent.click(securityTab);

    // Password change fields must be present
    expect(screen.getByLabelText(/mật khẩu hiện tại/i)).toBeTruthy();
    expect(screen.getByLabelText(/^mật khẩu mới$/i)).toBeTruthy();
    expect(screen.getByLabelText(/xác nhận mật khẩu mới/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /cập nhật mật khẩu/i })).toBeTruthy();

    // Name, dob, language fields and "cập nhật tài khoản" button must not exist
    expect(screen.queryByLabelText(/^ngày sinh$/i)).toBeNull();
    expect(screen.queryByLabelText(/^ngôn ngữ$/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /cập nhật tài khoản/i })).toBeNull();
  });

  it('validates and submits password change with react-hook-form and zod', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { message: 'Đổi mật khẩu thành công' } });

    renderSettingsPage();

    const settingsNav = screen.getByRole('navigation', { name: /các mục cài đặt/i });
    const securityTab = await within(settingsNav).findByRole('button', { name: /^bảo mật$/i });
    fireEvent.click(securityTab);

    // Try submit without entering anything -> triggers Zod validation
    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));
    expect(await screen.findByText(/vui lòng nhập mật khẩu hiện tại/i)).toBeTruthy();

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/mật khẩu hiện tại/i), {
      target: { value: 'CurrentPass123' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu mới$/i), {
      target: { value: 'NewSecurePass123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
      target: { value: 'NewSecurePass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/profile/password', {
        current_password: 'CurrentPass123',
        new_password: 'NewSecurePass123',
        new_password_confirmation: 'NewSecurePass123',
      });
    });
  });

  it('submits updated profile data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: {
        ...mockProfile,
        user: { ...mockProfile.user, name: 'Nguyễn Văn A Updated' },
      },
    });

    renderSettingsPage();

    // Wait until profile data is loaded and displayed
    const nameInput = await screen.findByDisplayValue('Nguyễn Văn A');
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A Updated' } });

    const submitBtn = screen.getByRole('button', { name: /cập nhật hồ sơ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({
          name: 'Nguyễn Văn A Updated',
        })
      );
    });
  });

  it('switches to Billing tab and renders Choose Your Plan pricing cards', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });

    renderSettingsPage();

    const settingsNav = screen.getByRole('navigation', { name: /các mục cài đặt/i });
    const billingTab = await within(settingsNav).findByRole('button', { name: /^gói dịch vụ$/i });
    fireEvent.click(billingTab);

    expect(screen.getByRole('heading', { level: 2, name: 'Choose Your Plan' })).toBeTruthy();
    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByText('Enterprise')).toBeTruthy();

    expect(screen.getByRole('button', { name: /choose basic/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /choose pro/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /choose enterprise/i })).toBeTruthy();
  });
});
