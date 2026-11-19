import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMyProfileQuery,
  useUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useToggleFollow,
} from './useProfile';
import { apiClient } from '@/core/api/client';

vi.mock('@/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
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
}));

describe('useProfile API hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches authenticated user profile (useMyProfileQuery)', async () => {
    const mockProfile = {
      user: { id: 1, name: 'Test User', email: 'test@example.com' },
      is_own_profile: true,
      stats: {
        presentation_count: 5,
        average_score: 8.5,
        practice_duration_minutes: 60,
        followers_count: 2,
        following_count: 3,
      },
      achievements: [],
      posts: [],
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockProfile });

    const { result } = renderHook(() => useMyProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.name).toBe('Test User');
    expect(apiClient.get).toHaveBeenCalledWith('/profile/me');
  });

  it('fetches another user profile (useUserProfileQuery)', async () => {
    const mockOther = {
      user: { id: 2, name: 'Other User', email: null },
      is_own_profile: false,
      is_following: false,
      stats: {
        presentation_count: 2,
        average_score: 7.0,
        practice_duration_minutes: 20,
        followers_count: 10,
        following_count: 5,
      },
      achievements: [],
      posts: [],
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOther });

    const { result } = renderHook(() => useUserProfileQuery(2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.is_own_profile).toBe(false);
    expect(apiClient.get).toHaveBeenCalledWith('/profile/2');
  });

  it('does not fetch another user profile when userId is falsy or undefined', () => {
    const { result } = renderHook(() => useUserProfileQuery(undefined), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('updates profile and invalidates profile query cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { user: { id: 1, name: 'Updated Name' }, message: 'Cập nhật thành công.' },
    });

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

    result.current.mutate({ name: 'Updated Name', headline: 'New headline', bio: 'New bio' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.put).toHaveBeenCalledWith('/profile', {
      name: 'Updated Name',
      headline: 'New headline',
      bio: 'New bio',
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['profile'] })
    );
  });

  it('updates password via mutation', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { message: 'Đổi mật khẩu thành công.' },
    });

    const { result } = renderHook(() => useChangePasswordMutation(), { wrapper });

    result.current.mutate({
      current_password: 'old-password',
      new_password: 'new-password',
      new_password_confirmation: 'new-password',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.put).toHaveBeenCalledWith('/profile/password', {
      current_password: 'old-password',
      new_password: 'new-password',
      new_password_confirmation: 'new-password',
    });
  });

  it('toggles follow status via mutation', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { user_id: 2, following: true } },
    });

    const { result } = renderHook(() => useToggleFollow(), { wrapper });

    result.current.mutate(2);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith('/community/users/2/follow');
  });
});
