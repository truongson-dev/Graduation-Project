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

  it('renders the live presentation workspace and switches to AI feedback', () => {
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

    expect(screen.getByRole('region', { name: 'Khu vực trình chiếu' })).toBeTruthy();
    expect(screen.getByText('test_slide.pdf')).toBeTruthy();
    expect(screen.getByText('Slide 1 introduction')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Trang trước' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: /nhận xét trực tiếp từ AI/i }));

    expect(screen.getByText('Tốc độ nói')).toBeTruthy();
    expect(screen.getByText('Từ đệm')).toBeTruthy();
    expect(screen.getByText('Giao tiếp mắt')).toBeTruthy();
    expect(screen.getByText('Tư thế')).toBeTruthy();
  });
});
