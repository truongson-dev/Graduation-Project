import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GradePanel, type PresentationReview } from './GradePanel';
import * as aiHooks from '../api/ai';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GradePanel', () => {
  it('renders standard question-answer grading form when no presentation review is passed', () => {
    render(<GradePanel />, { wrapper: createWrapper() });

    expect(screen.getByText('Chấm bài luyện tập tình huống')).toBeTruthy();
    expect(screen.getByLabelText('Kỹ năng')).toBeTruthy();
    expect(screen.getByLabelText('Câu hỏi / tình huống')).toBeTruthy();
    expect(screen.getByLabelText('Câu trả lời của bạn')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chấm điểm' })).toBeTruthy();
  });

  it('submits audio blob and slide metadata via FormData and displays AI transcript and metrics', async () => {
    const mockAudioBlob = new Blob(['fake audio content'], { type: 'audio/webm' });
    const mockOnEvaluated = vi.fn();

    const mockMutateAsync = vi.fn().mockResolvedValue({
      transcript: 'Xin chào mọi người đây là bài thuyết trình được AI chép lời.',
      words_per_minute: 130,
      fillers_count: 1,
      overall_score: 88,
      is_reading_slides: false,
      slide_coverage_score: 92,
      elaboration_quality: 'Diễn giải rất phong phú và mạch lạc.',
      voice_feedback: 'Nhịp nói ổn định, phát âm rõ.',
      body_language_feedback: 'Giao tiếp mắt tự nhiên.',
      strengths: ['Làm chủ nội dung', 'Giọng nói truyền cảm'],
      improvements: ['Nên giảm từ đệm hơn nữa'],
      actionable_tips: ['Tập ngắt nghỉ 1 giây trước khi chuyển slide'],
    });

    vi.spyOn(aiHooks, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof aiHooks.useEvaluatePresentation>);

    const review: PresentationReview = {
      audioBlob: mockAudioBlob,
      slideContent: '[Slide 1]: Giới thiệu SoftSkill AI',
      transcript: '',
      duration: '05:30',
      wordsPerMinute: 0,
      fillers: 0,
      eyeContact: 85,
      posture: 90,
      confidence: 88,
      fileName: 'gioi-thieu.pdf',
      language: 'vi',
    };

    render(
      <GradePanel presentationReview={review} onEvaluated={mockOnEvaluated} />,
      { wrapper: createWrapper() }
    );

    // Initial review duration
    expect(screen.getByText('05:30')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();

    // Verify evaluate was triggered with FormData
    expect(mockMutateAsync).toHaveBeenCalled();
    const passedArg = mockMutateAsync.mock.calls[0][0];
    expect(passedArg).toBeInstanceOf(FormData);
    const formData = passedArg as FormData;
    expect(formData.get('slide_content')).toBe('[Slide 1]: Giới thiệu SoftSkill AI');
    expect(formData.get('duration')).toBe('05:30');
    expect(formData.get('eye_contact_percent')).toBe('85');
    expect(formData.get('posture_score')).toBe('90');
    expect(formData.get('language')).toBe('vi');
    expect(formData.get('audio')).toBeTruthy();

    // Feedback content displayed
    expect(await screen.findByText('88')).toBeTruthy();
    expect(screen.getByText('Diễn giải tự nhiên, không phụ thuộc slide')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('Diễn giải rất phong phú và mạch lạc.')).toBeTruthy();
    expect(screen.getByText('Làm chủ nội dung')).toBeTruthy();

    // AI computed metrics displayed
    expect(screen.getByText('130')).toBeTruthy();
    expect(screen.getByText('130 wpm')).toBeTruthy();
    expect(screen.getByText('1 đệm')).toBeTruthy();

    // AI computed transcript displayed
    expect(screen.getByText('Xin chào mọi người đây là bài thuyết trình được AI chép lời.')).toBeTruthy();

    // onEvaluated callback fired
    expect(mockOnEvaluated).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: 'Xin chào mọi người đây là bài thuyết trình được AI chép lời.',
        words_per_minute: 130,
        fillers_count: 1,
      })
    );
  });

  it('renders reading warning when AI flags is_reading_slides as true', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      transcript: 'Dòng 1 text. Dòng 2 text.',
      words_per_minute: 110,
      fillers_count: 5,
      overall_score: 55,
      is_reading_slides: true,
      slide_coverage_score: 70,
      elaboration_quality: 'Nói lại gần như toàn bộ chữ trên slide.',
      voice_feedback: 'Giọng đều đều, hơi đọc sách.',
      body_language_feedback: 'Nhìn màn hình liên tục.',
      strengths: ['Bao quát được các đề mục'],
      improvements: ['Tránh đọc từng dòng trên slide'],
      actionable_tips: ['Chỉ để từ khóa trên slide'],
    });

    vi.spyOn(aiHooks, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof aiHooks.useEvaluatePresentation>);

    const review: PresentationReview = {
      slideContent: '[Slide 1]: Dòng 1 text\n[Slide 2]: Dòng 2 text',
      transcript: 'Dòng 1 text. Dòng 2 text.',
      duration: '02:00',
      wordsPerMinute: 110,
      fillers: 5,
      eyeContact: 40,
      posture: 60,
      confidence: 50,
      fileName: 'sample.pdf',
    };

    render(<GradePanel presentationReview={review} />, { wrapper: createWrapper() });

    expect(await screen.findByText('Cảnh báo: Có xu hướng đọc lại chữ trên slide')).toBeTruthy();
    expect(screen.getByText('55')).toBeTruthy();
    expect(screen.getByText('Cần cải thiện')).toBeTruthy();
  });
});
