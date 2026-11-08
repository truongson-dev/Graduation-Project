import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { extractSlideText } from './slide';

vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn(),
  };
});

vi.mock('@web-ppt/core', () => {
  return {
    parse: vi.fn(),
  };
});

describe('extractSlideText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string for null, undefined, or empty file', async () => {
    expect(await extractSlideText(null)).toBe('');
    expect(await extractSlideText(undefined)).toBe('');
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    expect(await extractSlideText(emptyFile)).toBe('');
  });

  it('returns fallback document tag for unsupported non-presentation files', async () => {
    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(await extractSlideText(txtFile)).toBe(
      '[Tài liệu trình chiếu: notes.txt]'
    );
  });

  it('extracts text per slide from a PDF file preserving line breaks', async () => {
    const mockPdf = {
      numPages: 2,
      getPage: vi.fn(async (pageNum: number) => {
        if (pageNum === 1) {
          return {
            getTextContent: async () => ({
              items: [
                { str: 'Giới thiệu dự án' },
                { str: 'Thành viên nhóm' },
                { str: '' },
              ],
            }),
          };
        }
        return {
          getTextContent: async () => ({
            items: [
              { str: 'Mục tiêu chiến lược' },
              { str: 'Kế hoạch triển khai' },
            ],
          }),
        };
      }),
    };

    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const file = new File(['dummy pdf binary content'], 'pitch-deck.pdf', {
      type: 'application/pdf',
    });

    const result = await extractSlideText(file);

    expect(result).toBe(
      '[Slide 1]:\nGiới thiệu dự án Thành viên nhóm\n\n[Slide 2]:\nMục tiêu chiến lược Kế hoạch triển khai'
    );
  });

  it('extracts structured lines and bullets when PDF provides coordinates', async () => {
    const mockPdf = {
      numPages: 1,
      getPage: vi.fn(async () => ({
        getTextContent: async () => ({
          items: [
            { str: 'LÀM VIỆC VỚI MẢNG TRONG PHP', transform: [20, 0, 0, 20, 50, 600], height: 20, width: 250 },
            { str: '• Mảng – cấu trúc lưu trữ dữ liệu quan trọng', transform: [14, 0, 0, 14, 50, 500], height: 14, width: 300 },
            { str: '• Các phép toán, hàm xử lý, sắp xếp', transform: [14, 0, 0, 14, 50, 460], height: 14, width: 280 },
            { str: '• Mảng nhiều chiều & chuyển đổi dữ liệu', transform: [14, 0, 0, 14, 50, 420], height: 14, width: 290 },
          ],
        }),
      })),
    };

    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockPdf),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const file = new File(['content'], 'php-array.pdf', { type: 'application/pdf' });
    const result = await extractSlideText(file);

    expect(result).toContain('[Slide 1]:');
    expect(result).toContain('LÀM VIỆC VỚI MẢNG TRONG PHP');
    expect(result).toContain('• Mảng – cấu trúc lưu trữ dữ liệu quan trọng');
    expect(result).toContain('• Các phép toán, hàm xử lý, sắp xếp');
    expect(result).toContain('• Mảng nhiều chiều & chuyển đổi dữ liệu');
  });

  it('extracts slide content and speaker notes from PowerPoint files (.pptx)', async () => {
    const { parse } = await import('@web-ppt/core');
    const mockPresentation = {
      slides: [
        {
          elements: [
            {
              kind: 'shape',
              y: 50,
              x: 100,
              text: {
                paragraphs: [
                  { runs: [{ text: 'Chiến lược phát triển' }], lvl: 0 },
                ],
              },
            },
            {
              kind: 'shape',
              y: 120,
              x: 100,
              text: {
                paragraphs: [
                  { runs: [{ text: 'Giai đoạn 1: MVP' }], lvl: 1, bullet: true },
                  { runs: [{ text: 'Giai đoạn 2: Mở rộng' }], lvl: 1, bullet: true },
                ],
              },
            },
          ],
          notes: 'Nhớ nhấn mạnh tiến độ quý 1 cho ban giám khảo.',
        },
      ],
      dispose: vi.fn(),
    };

    vi.mocked(parse).mockResolvedValue(mockPresentation as any);

    const pptxFile = new File(['pptx-bytes'], 'presentation.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    const result = await extractSlideText(pptxFile);

    expect(result).toContain('[Slide 1]:');
    expect(result).toContain('Chiến lược phát triển');
    expect(result).toContain('Giai đoạn 1: MVP');
    expect(result).toContain('Giai đoạn 2: Mở rộng');
    expect(result).toContain('Ghi chú diễn giả');
    expect(result).toContain('Nhớ nhấn mạnh tiến độ quý 1 cho ban giám khảo.');
    expect(mockPresentation.dispose).toHaveBeenCalled();
  });

  it('gracefully falls back when PDF parsing fails', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.reject(new Error('Corrupted PDF')),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const file = new File(['bad content'], 'corrupted.pdf', {
      type: 'application/pdf',
    });

    const result = await extractSlideText(file);

    expect(result).toBe('[Tài liệu: corrupted.pdf]');
    expect(warnSpy).toHaveBeenCalled();
  });
});
