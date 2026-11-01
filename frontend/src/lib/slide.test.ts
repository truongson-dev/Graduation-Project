import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { extractSlideText } from './slide';

vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn(),
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

  it('returns fallback document tag for non-PDF files', async () => {
    const pptxFile = new File(['content'], 'presentation.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    expect(await extractSlideText(pptxFile)).toBe(
      '[Tài liệu trình chiếu: presentation.pptx]'
    );

    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(await extractSlideText(txtFile)).toBe(
      '[Tài liệu trình chiếu: notes.txt]'
    );
  });

  it('extracts and formats text per slide from a PDF file', async () => {
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
      '[Slide 1]: Giới thiệu dự án Thành viên nhóm\n\n[Slide 2]: Mục tiêu chiến lược Kế hoạch triển khai'
    );
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
