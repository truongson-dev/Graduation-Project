import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/**
 * Extract plain text content from each slide of a PDF document.
 */
export async function extractSlideText(file: File | null | undefined): Promise<string> {
  if (!file || file.size === 0) return '';

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return `[Tài liệu trình chiếu: ${file.name}]`;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((str) => str.trim().length > 0);

      if (pageStrings.length > 0) {
        pagesText.push(`[Slide ${pageNum}]: ${pageStrings.join(' ')}`);
      }
    }

    return pagesText.join('\n\n');
  } catch (error) {
    console.warn('Could not extract PDF text:', error);
    return `[Tài liệu: ${file.name}]`;
  }
}
