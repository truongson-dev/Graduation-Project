import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as authLib from '@/features/auth/api/auth';
import { apiClient } from '@/core/api/client';
import type { UserProfileData } from '../types/profile';
import { ProfilePage } from './ProfilePage';

vi.mock('@/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  endpoints: {
    profile: {
      me: '/profile/me',
      update: '/profile',
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

const mockOwnProfile: UserProfileData = {
  user: {
    id: 1,
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2026-01-15T08:00:00Z',
  },
  community_profile: {
    username: 'nguyenvana',
    headline: 'Sinh viên CNTT - Đam mê thuyết trình',
    bio: 'Luôn tìm kiếm cơ hội cải thiện kỹ năng nói.',
  },
  stats: {
    presentation_count: 12,
    average_score: 8.5,
    practice_duration_minutes: 180,
    followers_count: 45,
    following_count: 20,
  },
  achievements: [
    {
      id: 'first_speech',
      name: 'Bài nói đầu tiên',
      icon: 'mic',
      unlocked_at: '2026-02-01T10:00:00Z',
    },
  ],
  posts: [
    {
      id: 101,
      content: 'Bí quyết để tự tin hơn khi thuyết trình?',
      topic: 'Kỹ năng mở đầu',
      likes_count: 15,
      replies_count: 4,
      created_at: '2026-03-01T12:00:00Z',
    },
  ],
  is_own_profile: true,
  is_following: false,
};

const mockOtherProfile: UserProfileData = {
  user: {
    id: 2,
    name: 'Trần Thị B',
    email: null,
    avatar_url: 'https://example.com/avatar-b.jpg',
    created_at: '2026-02-10T08:00:00Z',
  },
  community_profile: {
    username: 'tranthib',
    headline: 'Thành viên CLB Diễn thuyết',
    bio: 'Xin chào mọi người!',
  },
  stats: {
    presentation_count: 5,
    average_score: 9.0,
    practice_duration_minutes: 90,
    followers_count: 10,
    following_count: 8,
  },
  achievements: [],
  posts: [],
  is_own_profile: false,
  is_following: false,
};

describe('ProfilePage Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', avatar_url: null },
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

  const renderProfilePage = (initialEntry: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/settings" element={<div>Settings Page Mock</div>} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
  };

  it('renders own profile at /profile with all sections and action buttons', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOwnProfile });

    renderProfilePage('/profile');

    // Wait for profile data to load
    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn A' })).toBeTruthy();
    expect(screen.getByText('@nguyenvana')).toBeTruthy();
    expect(screen.getByText('Sinh viên CNTT - Đam mê thuyết trình')).toBeTruthy();
    expect(screen.getByText('Luôn tìm kiếm cơ hội cải thiện kỹ năng nói.')).toBeTruthy();

    // Stats section
    expect(screen.getByText('Thống kê luyện tập')).toBeTruthy();
    expect(screen.getByText('8.5 / 10')).toBeTruthy();
    expect(screen.getByText('12 bài')).toBeTruthy();
    expect(screen.getByText('180 phút')).toBeTruthy();

    // Achievements section
    expect(screen.getByText('Huy hiệu & Thành tựu')).toBeTruthy();
    expect(screen.getByText('Bài nói đầu tiên')).toBeTruthy();

    // Posts list section
    expect(screen.getByText('Bài viết cộng đồng')).toBeTruthy();
    expect(screen.getByText('Bí quyết để tự tin hơn khi thuyết trình?')).toBeTruthy();

    // Action buttons for own profile
    expect(screen.getByRole('button', { name: /chỉnh sửa hồ sơ/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /đổi mật khẩu/i })).toBeNull();
    // Follow button should not be present
    expect(screen.queryByRole('button', { name: /^theo dõi$/i })).toBeNull();
  });

  it("renders another student's profile at /profile/2 with follow button", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOtherProfile });

    renderProfilePage('/profile/2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Trần Thị B' })).toBeTruthy();
    expect(screen.getByText('@tranthib')).toBeTruthy();
    expect(screen.getByText('Thành viên CLB Diễn thuyết')).toBeTruthy();

    // Follow button is displayed instead of edit buttons
    expect(screen.getByRole('button', { name: /^theo dõi$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /chỉnh sửa hồ sơ/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /đổi mật khẩu/i })).toBeNull();
  });

  it('navigates to settings when clicking "Chỉnh sửa hồ sơ"', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOwnProfile });

    renderProfilePage('/profile');

    const editBtn = await screen.findByRole('button', { name: /chỉnh sửa hồ sơ/i });
    fireEvent.click(editBtn);

    expect(await screen.findByText('Settings Page Mock')).toBeTruthy();
  });

  it('triggers follow mutation when clicking "Theo dõi"', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOtherProfile });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { user_id: 2, following: true } },
    });

    renderProfilePage('/profile/2');

    const followBtn = await screen.findByRole('button', { name: /^theo dõi$/i });
    fireEvent.click(followBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/community/users/2/follow');
    });
  });
});
