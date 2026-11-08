import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

interface FormattedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  hasEOL: boolean;
}

function joinLineItems(items: FormattedItem[]): string {
  let result = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prev = items[i - 1];

    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      const prevEndsWithSpace = /\s$/.test(prev.str);
      const currStartsWithSpace = /^\s/.test(item.str);

      if (!prevEndsWithSpace && !currStartsWithSpace) {
        if (gap > 2 || prev.hasEOL) {
          result += ' ';
        }
      }
    }
    result += item.str;
  }
  return result;
}

function formatPdfPageText(items: any[]): string {
  if (!items || !Array.isArray(items)) return '';

  const validItems: FormattedItem[] = [];

  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    const str = item.str;
    if (!str && !item.hasEOL) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [12, 0, 0, 12, 0, 0];

    validItems.push({
      str,
      x: typeof transform[4] === 'number' ? transform[4] : 0,
      y: typeof transform[5] === 'number' ? transform[5] : 0,
      width: typeof item.width === 'number' ? item.width : 0,
      hasEOL: Boolean(item.hasEOL),
    });
  }

  if (validItems.length === 0) return '';

  const hasCoordinates = validItems.some((i) => i.x !== 0 || i.y !== 0);
  if (!hasCoordinates) {
    return validItems.map((i) => i.str).filter((s) => s.trim().length > 0).join(' ');
  }

  // Sort by Y descending (PDF Y increases upwards), then by X ascending
  validItems.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 6) return yDiff;
    return a.x - b.x;
  });

  const lines: string[] = [];
  let currentLine: FormattedItem[] = [];
  let currentY = validItems[0].y;
  let prevY: number | null = null;

  for (const item of validItems) {
    if (Math.abs(item.y - currentY) <= 6) {
      currentLine.push(item);
    } else {
      if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        const lineText = joinLineItems(currentLine).trim();
        if (lineText) {
          if (prevY !== null && Math.abs(prevY - currentY) > 28) {
            lines.push('');
          }
          lines.push(lineText);
          prevY = currentY;
        }
      }
      currentLine = [item];
      currentY = item.y;
    }
  }

  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    const lineText = joinLineItems(currentLine).trim();
    if (lineText) {
      if (prevY !== null && Math.abs(prevY - currentY) > 28) {
        lines.push('');
      }
      lines.push(lineText);
    }
  }

  return lines.join('\n');
}

function extractElementsText(elements: any[] | undefined, lines: string[]) {
  if (!elements || !Array.isArray(elements)) return;

  const sorted = [...elements].sort((a, b) => {
    const yDiff = (a?.y ?? 0) - (b?.y ?? 0);
    if (Math.abs(yDiff) > 8) return yDiff;
    return (a?.x ?? 0) - (b?.x ?? 0);
  });

  for (const el of sorted) {
    if (!el) continue;

    if (el.kind === 'shape' && el.text?.paragraphs) {
      for (const p of el.text.paragraphs) {
        const text = p.runs?.map((r: any) => r.text || '').join('').trim();
        if (!text) continue;

        const bulletPrefix = p.bullet ? '• ' : '';
        const indent = '  '.repeat(Math.max(0, p.lvl || 0));
        lines.push(`${indent}${bulletPrefix}${text}`);
      }
    } else if (el.kind === 'table' && el.rows) {
      for (const row of el.rows) {
        const rowCells: string[] = [];
        for (const cell of row.cells || []) {
          const cellText =
            cell.text?.paragraphs
              ?.map((p: any) => p.runs?.map((r: any) => r.text || '').join('').trim())
              .filter(Boolean)
              .join(' ') || '';
          if (cellText) rowCells.push(cellText);
        }
        if (rowCells.length > 0) {
          lines.push(rowCells.join(' | '));
        }
      }
    } else if (el.kind === 'group' && el.children) {
      extractElementsText(el.children, lines);
    }
  }
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pagesText: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const formatted = formatPdfPageText(textContent.items);

    if (formatted.trim().length > 0) {
      pagesText.push(`[Slide ${pageNum}]:\n${formatted}`);
    }
  }

  return pagesText.join('\n\n');
}

async function extractPowerPointText(file: File): Promise<string> {
  const { parse } = await import('@web-ppt/core');
  const presentation = await parse(file);
  const pagesText: string[] = [];

  presentation.slides.forEach((slide, index) => {
    const pageNum = index + 1;
    const lines: string[] = [];

    extractElementsText(slide.elements, lines);

    const speakerNotes = slide.notes?.trim();
    if (speakerNotes) {
      if (lines.length > 0) lines.push('');
      lines.push(`[Ghi chú diễn giả]:\n${speakerNotes}`);
    }

    if (lines.length > 0) {
      pagesText.push(`[Slide ${pageNum}]:\n${lines.join('\n')}`);
    } else {
      pagesText.push(`[Slide ${pageNum}]: [Slide này không có nội dung chữ]`);
    }
  });

  presentation.dispose?.();
  return pagesText.join('\n\n');
}

/**
 * Extract plain text and notes from each slide of a PDF or PowerPoint document, preserving lines and bullets.
 */
export async function extractSlideText(file: File | null | undefined): Promise<string> {
  if (!file || file.size === 0) return '';

  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pptx' || extension === 'ppt') {
      return await extractPowerPointText(file);
    }

    if (extension === 'pdf') {
      return await extractPdfText(file);
    }

    return `[Tài liệu trình chiếu: ${file.name}]`;
  } catch (error) {
    console.warn(`Could not extract slide text for ${file.name}:`, error);
    return `[Tài liệu: ${file.name}]`;
  }
}
