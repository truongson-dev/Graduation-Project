import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useLearningPathsQuery,
  useLearningPathQuery,
  useSectionQuery,
} from './useLearningPath';
import { useLessonQuery } from './useLesson';
import { useLessonAttemptMutation } from './useLessonAttempt';
import { useGamificationQuery, useConsumeLifeMutation } from './useGamification';
import { apiClient } from '@/core/api/client';

vi.mock('@/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  endpoints: {
    learning: {
      paths: '/learning/paths',
      path: (slug: string) => `/learning/paths/${slug}`,
      section: (id: string | number) => `/learning/sections/${id}`,
      lesson: (id: string | number) => `/learning/lessons/${id}`,
      attempts: (id: string | number) => `/learning/lessons/${id}/attempts`,
      attempt: (id: string | number) => `/learning/lessons/${id}/attempt`,
      progress: '/learning/progress',
      gamification: '/learning/gamification',
      consumeLife: '/learning/lives/consume',
      leaderboard: '/learning/leaderboard',
      streak: '/learning/streak',
    },
  },
}));

describe('Learning API hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('fetches learning path detail (useLearningPathQuery)', async () => {
    const mockData = {
      id: 1,
      title: 'Kỹ năng mềm',
      slug: 'ky-nang-mem',
      sections: [{ id: 1, title: 'Khởi động', status: 'current', lessons_count: 3 }],
      summary: { percentage: 20 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const { result } = renderHook(() => useLearningPathQuery('ky-nang-mem'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Kỹ năng mềm');
    expect(result.current.data?.sections).toHaveLength(1);
  });

  it('fetches lesson detail (useLessonQuery)', async () => {
    const mockLesson = {
      id: 4,
      title: 'Diễn đạt ý tưởng rõ ràng',
      type: 'theory',
      status: 'unlocked',
      content: { markdown: '# Nội dung' },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockLesson } });

    const { result } = renderHook(() => useLessonQuery(4), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Diễn đạt ý tưởng rõ ràng');
  });

  it('submits lesson attempt (useLessonAttemptMutation)', async () => {
    const mockResult = {
      attempt_id: 10,
      score: 100,
      passed: true,
      xp_earned: 15,
      next_lesson: { id: 5, title: 'Bài tiếp theo' },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: mockResult } });

    const { result } = renderHook(() => useLessonAttemptMutation(4), { wrapper });

    result.current.mutate({ completed: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.score).toBe(100);
    expect(result.current.data?.next_lesson?.id).toBe(5);
  });

  it('fetches gamification and consumes life', async () => {
    const mockGamification = {
      total_xp: 250,
      current_streak: 5,
      lives_count: 5,
      lives_max: 5,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: mockGamification } });

    const { result } = renderHook(() => useGamificationQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_xp).toBe(250);

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { lives_count: 4, lives_max: 5, lives_refill_at: null } },
    });
    const { result: consumeResult } = renderHook(() => useConsumeLifeMutation(), { wrapper });
    consumeResult.current.mutate();
    await waitFor(() => expect(consumeResult.current.isSuccess).toBe(true));
    expect(consumeResult.current.data?.lives_count).toBe(4);
  });
});
