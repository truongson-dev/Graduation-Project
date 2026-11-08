import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PresentationReviewPage } from './PresentationReviewPage';
import * as aiHooks from '@/features/coach/api/ai';

const createWrapper = (state?: unknown) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/practice/review', state }]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PresentationReviewPage', () => {
  it('renders audio player and updates metrics from AI evaluation feedback', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-audio-uuid');
    URL.revokeObjectURL = vi.fn();

    const mockMutateAsync = vi.fn().mockResolvedValue({
      transcript: 'Bản chép lời AI thông minh.',
      words_per_minute: 128,
      fillers_count: 2,
      overall_score: 85,
      is_reading_slides: false,
      slide_coverage_score: 90,
      elaboration_quality: 'Rõ ràng và súc tích.',
      voice_feedback: 'Nhịp nói chuẩn 128 wpm.',
      body_language_feedback: 'Giao tiếp mắt tốt.',
      strengths: ['Tự tin'],
      improvements: ['Nói to hơn'],
      actionable_tips: ['Tiếp tục phát huy'],
    });

    vi.spyOn(aiHooks, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof aiHooks.useEvaluatePresentation>);

    const mockAudioBlob = new Blob(['mock audio'], { type: 'audio/webm' });

    render(<PresentationReviewPage />, {
      wrapper: createWrapper({
        presentationReview: {
          audioBlob: mockAudioBlob,
          slideContent: 'Slide nội dung demo',
          transcript: '',
          duration: '03:15',
          wordsPerMinute: 0,
          fillers: 0,
          eyeContact: 75,
          posture: 80,
          confidence: 85,
          fileName: 'demo.pdf',
          language: 'vi',
        },
      }),
    });

    // Audio player should be visible
    expect(screen.getByTestId('presentation-audio')).toBeTruthy();
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockAudioBlob);

    // AI evaluation should be triggered
    expect(mockMutateAsync).toHaveBeenCalled();

    // AI computed metrics should update the review page
    expect((await screen.findAllByText('128')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('từ / phút').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('lần').length).toBeGreaterThan(0);

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('safely handles historical review with non-Blob audioBlob without throwing TypeError', () => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn();

    vi.spyOn(aiHooks, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof aiHooks.useEvaluatePresentation>);

    // Render with serialized empty object as audioBlob (from localStorage / history)
    render(<PresentationReviewPage />, {
      wrapper: createWrapper({
        presentationReview: {
          audioBlob: {} as unknown as Blob,
          slideContent: 'Slide nội dung demo',
          transcript: 'Bản chép lời cũ',
          duration: '02:00',
          wordsPerMinute: 120,
          fillers: 1,
          eyeContact: 70,
          posture: 75,
          confidence: 80,
          fileName: 'demo.pdf',
        },
        isHistoricalReview: true,
      }),
    });

    expect(screen.queryByTestId('presentation-audio')).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    URL.createObjectURL = originalCreate;
  });

  it('displays saved feedback directly and does NOT re-evaluate AI when isHistoricalReview is true', async () => {
    const mockMutateAsync = vi.fn();
    vi.spyOn(aiHooks, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof aiHooks.useEvaluatePresentation>);

    const savedFeedback: aiHooks.PresentationEvaluationFeedback = {
      transcript: 'Bản chép lời đã lưu trong lịch sử.',
      words_per_minute: 135,
      fillers_count: 1,
      overall_score: 92,
      is_reading_slides: false,
      slide_coverage_score: 95,
      elaboration_quality: 'Diễn giải rất tự nhiên và đầy đủ ý.',
      voice_feedback: 'Âm lượng rõ ràng, truyền cảm.',
      body_language_feedback: 'Tương tác mắt tự tin.',
      strengths: ['Tự tin nổi bật', 'Nội dung mạch lạc'],
      improvements: ['Nói chậm lại ở đoạn mở đầu'],
      actionable_tips: ['Giữ vững phong độ này'],
    };

    render(<PresentationReviewPage />, {
      wrapper: createWrapper({
        presentationReview: {
          slideContent: 'Slide demo',
          transcript: savedFeedback.transcript,
          duration: '01:30',
          wordsPerMinute: 135,
          fillers: 1,
          eyeContact: 85,
          posture: 90,
          confidence: 90,
          fileName: 'user_stories.pdf',
          language: 'vi',
          feedback: savedFeedback,
        },
        isHistoricalReview: true,
      }),
    });

    // Should NEVER trigger new evaluation mutation
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // Should display historical badge and saved metrics immediately
    expect(screen.getByText('Bản ghi lịch sử đã chấm')).toBeTruthy();
    expect(screen.getAllByText('135').length).toBeGreaterThan(0);
    expect(screen.getAllByText('từ / phút').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('lần').length).toBeGreaterThan(0);
    expect(screen.getAllByText('92').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tự tin nổi bật').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Diễn giải rất tự nhiên và đầy đủ ý.').length).toBeGreaterThan(0);
  });
});
