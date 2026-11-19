import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeLivePage, parseSlideNotes } from './PracticeLivePage';
import { resetVisionTasksCacheForTesting } from '../hooks/useMediaPipeTracking';

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
        getTextContent: vi.fn().mockResolvedValue({ items: [] }),
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

class MockAudioContext {
  state = 'running';
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 512,
    frequencyBinCount: 256,
    getByteTimeDomainData: vi.fn(),
  });
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
  });
}

class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true);
  state = 'inactive';
  start = vi.fn().mockImplementation(function (this: MockMediaRecorder) {
    this.state = 'recording';
  });
  stop = vi.fn().mockImplementation(function (this: MockMediaRecorder) {
    this.state = 'inactive';
    this.onstop?.();
  });
  pause = vi.fn().mockImplementation(function (this: MockMediaRecorder) {
    this.state = 'paused';
  });
  resume = vi.fn().mockImplementation(function (this: MockMediaRecorder) {
    this.state = 'recording';
  });
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
}

class MockMediaStream {
  tracks: unknown[] = [];
  active = true;
  constructor(tracks: unknown[] = []) {
    this.tracks = tracks;
  }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks; }
}

describe('PracticeLivePage Web Speech API', () => {
  beforeEach(() => {
    (window as unknown as { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition;
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
    (window as unknown as { MediaRecorder: typeof MockMediaRecorder }).MediaRecorder = MockMediaRecorder;
    (window as unknown as { MediaStream: typeof MockMediaStream }).MediaStream = MockMediaStream;

    const mockTrack = { stop: vi.fn(), enabled: true, readyState: 'live' };
    const mockStream = new MockMediaStream([mockTrack]);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    resetVisionTasksCacheForTesting();
    vi.restoreAllMocks();
  });

  it('renders the live presentation workspace with Ghi chú tab and switches to AI feedback', () => {
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
    expect(screen.getByRole('tab', { name: /ghi chú/i })).toBeTruthy();
    expect(screen.getByRole('tabpanel', { name: 'Ghi chú trình chiếu' })).toBeTruthy();
    expect(screen.getByText('Slide 1 introduction')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Trang trước' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: /thông số/i }));

    expect(screen.queryByText('Tốc độ nói')).toBeNull();
    expect(screen.queryByText('Từ đệm')).toBeNull();
    expect(screen.getByText('Giao tiếp mắt')).toBeTruthy();
    expect(screen.getByText('Tư thế')).toBeTruthy();
  });

  it('does not render countdown timer overlay when entering practice session', () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: true,
        },
      }),
    });

    expect(screen.queryByText('Bắt đầu sau')).toBeNull();
  });

  it('renders zoom button and controls slide zoom via slider and reset button', () => {
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

    const zoomButton = screen.getByRole('button', { name: 'Phóng to / Thu nhỏ slide' });
    expect(zoomButton).toBeTruthy();

    // Open zoom controls popover
    fireEvent.click(zoomButton);

    const zoomRegion = screen.getByRole('region', { name: 'Điều chỉnh thu phóng slide' });
    expect(zoomRegion).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    const slider = screen.getByRole('slider', { name: 'Mức độ thu phóng' }) as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe('100');

    // Change zoom level
    fireEvent.change(slider, { target: { value: '150' } });
    expect(screen.getByText('150%')).toBeTruthy();
    expect(slider.value).toBe('150');

    // Reset zoom with "Vừa" button
    const fitButton = screen.getByRole('button', { name: 'Vừa' });
    fireEvent.click(fitButton);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(slider.value).toBe('100');
  });

  it('toggles fullscreen on and off', async () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    const exitFullscreenMock = vi.fn().mockResolvedValue(undefined);

    HTMLElement.prototype.requestFullscreen = requestFullscreenMock;
    document.exitFullscreen = exitFullscreenMock;

    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: false,
        },
      }),
    });

    const fullscreenBtn = screen.getByRole('button', { name: 'Trình chiếu toàn màn hình' });
    expect(fullscreenBtn).toBeTruthy();

    // Click to enter fullscreen
    fireEvent.click(fullscreenBtn);
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);

    // Simulate fullscreenchange entering fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.body,
    });
    fireEvent(document, new Event('fullscreenchange'));

    // Should now show exit fullscreen button
    const exitFullscreenBtn = screen.getByRole('button', { name: 'Thoát toàn màn hình' });
    expect(exitFullscreenBtn).toBeTruthy();

    // Click to exit fullscreen
    fireEvent.click(exitFullscreenBtn);
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);

    // Simulate fullscreenchange exiting fullscreen
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    fireEvent(document, new Event('fullscreenchange'));

    expect(screen.getByRole('button', { name: 'Trình chiếu toàn màn hình' })).toBeTruthy();
  });

  it('renders floating controls for adjusting font size and editing slide notes', () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });

    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: '[Slide 1]:\nNội dung slide 1\n\n[Slide 2]:\nNội dung slide 2',
          autoStart: false,
        },
      }),
    });

    // "Ghi chú" tab is active by default and displays current slide's text
    expect(screen.getByRole('tab', { name: /ghi chú/i })).toBeTruthy();
    expect(screen.getByText('Nội dung slide 1')).toBeTruthy();

    // Font size controls
    const decreaseBtn = screen.getByRole('button', { name: 'Giảm kích thước chữ ghi chú' });
    const resetBtn = screen.getByRole('button', { name: 'Đặt lại kích thước chữ ghi chú' });
    const increaseBtn = screen.getByRole('button', { name: 'Tăng kích thước chữ ghi chú' });
    expect(decreaseBtn).toBeTruthy();
    expect(resetBtn).toBeTruthy();
    expect(increaseBtn).toBeTruthy();

    fireEvent.click(increaseBtn);
    fireEvent.click(decreaseBtn);
    fireEvent.click(resetBtn);

    // Edit button toggles textarea mode
    const editBtn = screen.getByRole('button', { name: 'Chỉnh sửa ghi chú' });
    expect(editBtn).toBeTruthy();

    fireEvent.click(editBtn);

    // Textarea is rendered with current slide note
    const textarea = screen.getByRole('textbox', { name: 'Ghi chú trang 1' }) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('Nội dung slide 1');

    // Edit note content
    fireEvent.change(textarea, { target: { value: 'Nội dung slide 1 đã chỉnh sửa' } });
    expect(textarea.value).toBe('Nội dung slide 1 đã chỉnh sửa');

    // Toggle edit mode off
    fireEvent.click(editBtn);
    expect(screen.getByText('Nội dung slide 1 đã chỉnh sửa')).toBeTruthy();
  });

  it('updates slide note when navigating between slides', () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: '[Slide 1]:\nNội dung slide 1\n\n[Slide 2]:\nNội dung slide 2',
          autoStart: false,
        },
      }),
    });

    expect(screen.getByText('Nội dung slide 1')).toBeTruthy();

    // Go to next slide
    const nextBtn = screen.getByRole('button', { name: 'Trang sau' });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Nội dung slide 2')).toBeTruthy();
  });

  it('correctly parses slide notes from various formats', () => {
    expect(parseSlideNotes('')).toEqual({});
    expect(parseSlideNotes('   ')).toEqual({});

    // Raw string without tags
    expect(parseSlideNotes('Giới thiệu đề tài tốt nghiệp')).toEqual({
      1: 'Giới thiệu đề tài tốt nghiệp',
    });

    // Multi-page string
    const multiPage = `[Slide 1]:
Tiêu đề trang 1
Nội dung chi tiết trang 1

[Slide 2]:
Tiêu đề trang 2
Nội dung chi tiết trang 2`;

    expect(parseSlideNotes(multiPage)).toEqual({
      1: 'Tiêu đề trang 1\nNội dung chi tiết trang 1',
      2: 'Tiêu đề trang 2\nNội dung chi tiết trang 2',
    });
  });

  it('renders speaker video element and camera tile even on default Ghi chú tab', () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    const { container } = render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: false,
        },
      }),
    });

    // Check that video element is mounted in DOM
    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    // Check that Ghi chú tab is active
    expect(screen.getByRole('tabpanel', { name: 'Ghi chú trình chiếu' })).toBeTruthy();
  });

  it('runs the 15-minute presentation timer when autoStart is enabled', async () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: true,
        },
      }),
    });

    // Wait for async startSession to transition status to live
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tạm dừng thuyết trình' })).toBeTruthy();
    });

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(3000);

    // Timer has advanced past 00:00
    expect(screen.getByText(/00:0[2-5]/)).toBeTruthy();

    vi.useRealTimers();
  });

  it('pauses, resumes, and resets the 15-minute presentation timer', async () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: true,
        },
      }),
    });

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tạm dừng thuyết trình' })).toBeTruthy();
    });

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(2000);
    const timeBeforePause = screen.getByText(/00:0[1-9]/).textContent;

    // Pause
    const pauseBtn = screen.getByRole('button', { name: 'Tạm dừng thuyết trình' });
    fireEvent.click(pauseBtn);

    // Wait while paused
    await vi.advanceTimersByTimeAsync(3000);
    // Should still be unchanged
    expect(screen.getByText(timeBeforePause!)).toBeTruthy();

    // Resume
    const resumeBtn = screen.getByRole('button', { name: 'Tiếp tục thuyết trình' });
    fireEvent.click(resumeBtn);

    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.queryByText(timeBeforePause!)).toBeNull();

    // Reset
    const resetBtn = screen.getByRole('button', { name: 'Đặt lại thời gian về 00:00' });
    fireEvent.click(resetBtn);

    expect(screen.getByText('00:00')).toBeTruthy();

    vi.useRealTimers();
  });

  it('renders completion summary dialog with Thời gian, Giao tiếp mắt, Tư thế and without Từ đệm, Tốc độ, Tự tin', async () => {
    const dummyFile = new File(['dummy content'], 'test_slide.pdf', { type: 'application/pdf' });
    render(<PracticeLivePage />, {
      wrapper: createWrapper({
        practice: {
          file: dummyFile,
          slideContent: 'Slide 1 introduction',
          autoStart: true,
        },
      }),
    });

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Kết thúc thuyết trình' })).toBeTruthy();
    });

    const finishBtn = screen.getByRole('button', { name: 'Kết thúc thuyết trình' });
    fireEvent.click(finishBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Tóm tắt phiên thuyết trình')).toBeTruthy();
    expect(within(dialog).getByText('Thời gian')).toBeTruthy();
    expect(within(dialog).getByText('Giao tiếp mắt')).toBeTruthy();
    expect(within(dialog).getByText('Tư thế')).toBeTruthy();

    expect(within(dialog).queryByText('Từ đệm')).toBeNull();
    expect(within(dialog).queryByText('Tốc độ')).toBeNull();
    expect(within(dialog).queryByText('Tự tin')).toBeNull();
  });
});
