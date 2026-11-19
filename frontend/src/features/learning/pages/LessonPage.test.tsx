import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as authLib from '@/features/auth/api/auth';
import { apiClient } from '@/core/api/client';
import { LessonPage } from './LessonPage';

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

describe('LessonPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Học viên Test', email: 'test@example.com' },
      isLoading: false,
      isPending: false,
      isError: false,
    } as any);

    // Mock gamification profile
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/learning/gamification')) {
        return Promise.resolve({
          data: {
            data: {
              total_xp: 350,
              current_streak: 4,
              longest_streak: 7,
              lives_count: 5,
              lives_max: 5,
              tournament_tier: 'Đồng',
              tournament_rank: 5,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (lessonId: number) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[`/learning/lesson/${lessonId}`]}>
            <Routes>
              <Route path="/learning/lesson/:id" element={<LessonPage />} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  it('renders Theory lesson and submits completion', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/learning/lessons/1')) {
        return Promise.resolve({
          data: {
            data: {
              id: 1,
              title: 'Khám phá điểm mạnh của bạn',
              type: 'theory',
              pass_threshold: 0,
              xp_reward: 15,
              section: { id: 1, title: 'Khởi động' },
              status: 'unlocked',
              content: {
                markdown: '## Khám Phá Điểm Mạnh Của Bản Thân\n\nNội dung lý thuyết giao tiếp.',
              },
            },
          },
        });
      }
      if (url.includes('/learning/gamification')) {
        return Promise.resolve({
          data: {
            data: { total_xp: 100, current_streak: 1, lives_count: 5, lives_max: 5 },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: {
          attempt_id: 1,
          score: 100,
          passed: true,
          xp_earned: 15,
          next_lesson: { id: 2, title: 'Đặt mục tiêu' },
        },
      },
    });

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText('Khám phá điểm mạnh của bạn')).toBeTruthy();
    });

    expect(screen.getByText('BÀI ĐỌC LÝ THUYẾT')).toBeTruthy();

    const completeBtn = screen.getByRole('button', { name: /đã hiểu & hoàn thành/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(screen.getByText('Chúc mừng bạn đã hoàn thành!')).toBeTruthy();
      expect(screen.getByText('Học bài tiếp theo')).toBeTruthy();
    });
  });

  it('renders Quiz lesson and answers question', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/learning/lessons/2')) {
        return Promise.resolve({
          data: {
            data: {
              id: 2,
              title: 'Đặt mục tiêu SMART',
              type: 'quiz',
              pass_threshold: 70,
              xp_reward: 20,
              section: { id: 1, title: 'Khởi động' },
              status: 'unlocked',
              content: {
                questions: [
                  {
                    text: 'SMART là gì?',
                    options: ['Cụ thể, Đo lường được...', 'Nhanh chóng, Linh hoạt...'],
                  },
                ],
              },
            },
          },
        });
      }
      if (url.includes('/learning/gamification')) {
        return Promise.resolve({
          data: {
            data: { total_xp: 100, current_streak: 1, lives_count: 5, lives_max: 5 },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderComponent(2);

    await waitFor(() => {
      expect(screen.getByText('Đặt mục tiêu SMART')).toBeTruthy();
      expect(screen.getByText('BÀI TRẮC NGHIỆM')).toBeTruthy();
      expect(screen.getByText('SMART là gì?')).toBeTruthy();
    });

    const optionBtn = screen.getByText('Cụ thể, Đo lường được...');
    fireEvent.click(optionBtn);

    const submitBtn = screen.getByRole('button', { name: /nộp bài trắc nghiệm/i });
    expect(submitBtn).toBeTruthy();
  });
});
