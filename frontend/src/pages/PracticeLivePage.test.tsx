import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeLivePage } from './PracticeLivePage';

// Mock dependencies that require browser canvas, video stream, or wasm
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  FaceLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn().mockReturnValue({ faceLandmarks: [] }),
      close: vi.fn(),
    }),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }),
      close: vi.fn(),
    }),
  },
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 800, height: 600 }),
        render: vi.fn().mockReturnValue({
          promise: Promise.resolve(),
          cancel: vi.fn(),
        }),
      }),
      destroy: vi.fn(),
    }),
    destroy: vi.fn(),
  }),
}));

const createWrapper = (state?: unknown) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/practice/live', state }]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

describe('PracticeLivePage Web Speech API', () => {
  beforeEach(() => {
    (window as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders presentation live meeting stage and opens AI coach drawer with speech controls', () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: false,
        },
      }),
    });

    expect(screen.getAllByText('mak-pyhx-mra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dừng trình bày')).toBeTruthy();

    // Open AI Coach Drawer
    const coachToggleBtn = screen.getByTitle('Hoạt động AI & Phân tích tác phong');
    fireEvent.click(coachToggleBtn);

    expect(screen.getByText('Tác phong AI')).toBeTruthy();

    // Switch to transcript tab
    fireEvent.click(screen.getByRole('button', { name: /lời thoại live/i }));
    expect(screen.getByText('Phụ đề nhận dạng thời gian thực')).toBeTruthy();
  });
});
