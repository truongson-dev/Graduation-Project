import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSetupPage } from './PracticeSetupPage';

vi.mock('../api/slide', () => ({
  extractSlideText: vi.fn().mockResolvedValue('Mock slide content'),
}));

vi.mock('../hooks/useMediaPipeTracking', () => ({
  preloadVisionTasks: vi.fn().mockResolvedValue({}),
}));

vi.mock('../api/presentation-session', () => ({
  usePresentationSessions: vi.fn().mockReturnValue({
    data: {
      data: [
        {
          id: 'session-12345678',
          title: 'Test_Presentation.pdf',
          created_at: '2026-11-18T10:00:00Z',
          duration_seconds: 90,
          status: 'completed',
        },
      ],
    },
    isLoading: false,
  }),
  useDeletePresentation: vi.fn().mockReturnValue({
    mutateAsync: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/setup']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-blob');
  } else {
    vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test-blob');
  }
  if (!globalThis.URL.revokeObjectURL) {
    globalThis.URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PracticeSetupPage Language Selection', () => {
  it('renders presentation language selector with Vietnamese selected by default', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Ngôn ngữ thuyết trình')).toBeTruthy();

    const viButton = screen.getByRole('button', { name: /tiếng việt/i });
    const enButton = screen.getByRole('button', { name: /tiếng anh/i });

    expect(viButton).toBeTruthy();
    expect(enButton).toBeTruthy();
    expect(viButton.getAttribute('aria-pressed')).toBe('true');
    expect(enButton.getAttribute('aria-pressed')).toBe('false');

    // National flag SVGs are rendered instead of text letters
    expect(viButton.querySelector('svg')).toBeTruthy();
    expect(enButton.querySelector('svg')).toBeTruthy();

    // Checklist also reflects selected language
    expect(screen.getAllByText('Tiếng Việt').length).toBeGreaterThanOrEqual(1);
  });

  it('allows user to switch language between Vietnamese and English', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    const viButton = screen.getByRole('button', { name: /tiếng việt/i });
    const enButton = screen.getByRole('button', { name: /tiếng anh/i });

    // Click English
    fireEvent.click(enButton);

    expect(enButton.getAttribute('aria-pressed')).toBe('true');
    expect(viButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByText('Tiếng Anh').length).toBeGreaterThanOrEqual(1);

    // Click Vietnamese back
    fireEvent.click(viButton);

    expect(viButton.getAttribute('aria-pressed')).toBe('true');
    expect(enButton.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('PracticeSetupPage PDF Document Upload', () => {
  it('displays PDF-only format indicator and accept attribute on file input', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    expect(screen.getByText('PDF • Tối đa 100 MB')).toBeTruthy();
    expect(screen.getByText('Chỉ hỗ trợ tập tin PDF (.pdf)')).toBeTruthy();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.getAttribute('accept')).toBe('.pdf,application/pdf');
  });

  it('rejects non-PDF files such as PPTX and shows notice message', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const pptxFile = new File(['mock content'], 'presentation.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    fireEvent.change(fileInput, { target: { files: [pptxFile] } });

    expect(screen.getByText('Vui lòng chọn file định dạng PDF.')).toBeTruthy();
  });

  it('accepts valid PDF file and displays the uploaded file name', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const pdfFile = new File(['mock pdf content'], 'report.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(screen.queryByText('Vui lòng chọn file định dạng PDF.')).toBeNull();
    expect(screen.getByText('report.pdf')).toBeTruthy();

    // Verify "Đổi file" button is removed
    expect(screen.queryByRole('button', { name: /đổi file/i })).toBeNull();
    // "Xem trước" button still exists
    expect(screen.getByRole('button', { name: /xem trước/i })).toBeTruthy();
  });
});

describe('PracticeSetupPage Presentation History Table', () => {
  it('renders history table with column header icons and removes arrow report button in favor of menu', () => {
    localStorage.setItem(
      'softskill.presentation-history.v1',
      JSON.stringify([
        {
          id: 'session-12345678',
          createdAt: '2026-11-18T10:00:00Z',
          review: {
            fileName: 'Test_Presentation.pdf',
            duration: '01:30',
            transcript: 'Demo transcript',
            wordsPerMinute: 120,
            fillers: 2,
            eyeContact: 85,
            posture: 90,
          },
        },
      ])
    );

    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    // Table title
    expect(screen.getByText('Lịch sử phiên thuyết trình')).toBeTruthy();

    // Column headers
    expect(screen.getByText('PHIÊN THUYẾT TRÌNH')).toBeTruthy();
    expect(screen.getByText('THỜI GIAN')).toBeTruthy();
    expect(screen.getByText('THỜI LƯỢNG')).toBeTruthy();
    expect(screen.getByText('TRẠNG THÁI AI')).toBeTruthy();

    // Data row
    expect(screen.getByText('Test_Presentation.pdf')).toBeTruthy();

    // Report button with arrow should NOT exist
    expect(screen.queryByRole('button', { name: /Báo cáo/i })).toBeNull();

    // Row action options button (...) exists
    const optionsButton = screen.getByRole('button', { name: /Tùy chọn cho bài Test_Presentation\.pdf/i });
    expect(optionsButton).toBeTruthy();

    // Row selection checkboxes are hidden
    expect(screen.queryByRole('checkbox', { name: /Chọn tất cả hàng/i })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /Chọn hàng/i })).toBeNull();
  });
});
