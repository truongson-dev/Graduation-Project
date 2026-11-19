import { useEffect, useRef, useState } from 'react';
import type { Presentation } from '@web-ppt/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractSlideText } from '../api/slide';

export function parseSlideNotes(content: string): Record<number, string> {
  const notes: Record<number, string> = {};
  if (!content || !content.trim()) return notes;

  const regex = /\[Slide\s+(\d+)\]\s*:?\s*/gi;
  let match: RegExpExecArray | null;
  const matches: { page: number; index: number; headerLength: number }[] = [];

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      page: parseInt(match[1], 10),
      index: match.index,
      headerLength: match[0].length,
    });
  }

  if (matches.length === 0) {
    notes[1] = content.trim();
    return notes;
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index + current.headerLength;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const pageText = content.slice(startIndex, endIndex).trim();
    notes[current.page] = pageText;
  }

  return notes;
}

interface UsePresentationSlidesProps {
  file?: File;
  initialSlideContent?: string;
}

export function usePresentationSlides({ file, initialSlideContent }: UsePresentationSlidesProps) {
  const fileName = file?.name ?? 'hung_dung_do_an_tot_nghiep.pdf';
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfFrameRef = useRef<HTMLDivElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<Presentation | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const zoomPopoverRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  const [slideContent, setSlideContent] = useState(initialSlideContent ?? '');
  const [slideNumber, setSlideNumber] = useState(1);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [powerPointSvg, setPowerPointSvg] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [renderedZoom, setRenderedZoom] = useState(100);
  const [showZoomPopover, setShowZoomPopover] = useState(false);
  const [slidePan, setSlidePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canScrollThumbnailsLeft, setCanScrollThumbnailsLeft] = useState(false);
  const [canScrollThumbnailsRight, setCanScrollThumbnailsRight] = useState(false);
  const [slideLoadError, setSlideLoadError] = useState('');
  const [slideNotes, setSlideNotes] = useState<Record<number, string>>(() => parseSlideNotes(initialSlideContent ?? ''));
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteFontSize, setNoteFontSize] = useState(16);

  useEffect(() => {
    if (initialSlideContent) {
      setSlideContent(initialSlideContent);
    } else if (file) {
      void extractSlideText(file).then((text) => setSlideContent(text));
    }
  }, [file, initialSlideContent]);

  useEffect(() => {
    if (slideContent) {
      const parsed = parseSlideNotes(slideContent);
      setSlideNotes((prev) => {
        const nextNotes = { ...parsed };
        for (const [key, value] of Object.entries(prev)) {
          const page = Number(key);
          if (value && value !== parsed[page]) {
            nextNotes[page] = value;
          }
        }
        return nextNotes;
      });
    }
  }, [slideContent]);

  // PDF Loading & Rendering
  useEffect(() => {
    if (!file || !isPdf) return;
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    setSlideLoadError('');
    void file.arrayBuffer().then(async (data) => {
      if (cancelled) return null;
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      loadingTask = pdfjs.getDocument({ data });
      return loadingTask.promise;
    }).then((document) => {
      if (!document || cancelled) return;
      pdfDocumentRef.current = document;
      setPdfDocument(document);
      setSlideCount(document.numPages);
      setSlideNumber(1);
    }).catch(() => {
      if (!cancelled) setSlideLoadError('Không thể đọc PDF này. Hãy thử tải lại hoặc xuất tài liệu thành PDF mới.');
    });
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
      pdfDocumentRef.current = null;
      setPdfDocument(null);
    };
  }, [file, isPdf]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedZoom(zoomPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [zoomPercent]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current || !pdfFrameRef.current) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    const renderCurrentPage = async () => {
      try {
        const page = await pdfDocument.getPage(Math.min(slideNumber, pdfDocument.numPages));
        if (cancelled || !pdfCanvasRef.current || !pdfFrameRef.current) return;
        const frame = pdfFrameRef.current;
        const canvas = pdfCanvasRef.current;
        const baseViewport = page.getViewport({ scale: 1 });
        const cssScale = Math.min(frame.clientWidth / baseViewport.width, frame.clientHeight / baseViewport.height);
        const baseCssViewport = page.getViewport({ scale: cssScale });
        const baseWidth = Math.round(baseCssViewport.width);
        const baseHeight = Math.round(baseCssViewport.height);

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
        const zoomFactor = Math.max(0.5, renderedZoom / 100);
        const renderScale = cssScale * zoomFactor * pixelRatio;
        const renderViewport = page.getViewport({ scale: renderScale });

        const context = canvas.getContext('2d');
        if (!context) return;
        renderTask?.cancel();
        canvas.width = Math.round(renderViewport.width);
        canvas.height = Math.round(renderViewport.height);
        canvas.style.width = `${baseWidth}px`;
        canvas.style.height = `${baseHeight}px`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: renderViewport,
        });
        await renderTask.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setSlideLoadError('Không thể hiển thị trang PDF này.');
        }
      }
    };
    const observer = typeof ResizeObserver !== 'undefined' && pdfFrameRef.current ? new ResizeObserver(() => void renderCurrentPage()) : null;
    observer?.observe(pdfFrameRef.current!);
    void renderCurrentPage();
    return () => {
      cancelled = true;
      observer?.disconnect();
      renderTask?.cancel();
    };
  }, [pdfDocument, slideNumber, renderedZoom]);

  // PowerPoint Loading
  useEffect(() => {
    if (!file || file.name.toLowerCase().endsWith('.pdf')) return;
    let cancelled = false;
    setSlideLoadError('');
    void import('@web-ppt/core').then(async ({ parse }) => {
      try {
        const parsed = await parse(file);
        if (cancelled) {
          parsed.dispose?.();
          return;
        }
        presentationRef.current?.dispose?.();
        presentationRef.current = parsed;
        setPresentation(parsed);
        setSlideCount(parsed.slides.length);
        setSlideNumber(1);
      } catch {
        if (!cancelled) setSlideLoadError('Không thể đọc file PowerPoint này. Hãy thử lưu lại dưới dạng PPTX hoặc PDF.');
      }
    });
    return () => {
      cancelled = true;
      presentationRef.current?.dispose?.();
      presentationRef.current = null;
      setPowerPointSvg('');
    };
  }, [file]);

  useEffect(() => {
    if (!presentation) return;
    void import('@web-ppt/core').then(({ renderSlideToSvg }) => {
      const slide = presentation.slides[slideNumber - 1];
      setPowerPointSvg(slide ? renderSlideToSvg(presentation, slide, { textMode: 'html' }) : '');
    });
  }, [presentation, slideNumber]);

  useEffect(() => {
    if (!showZoomPopover) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        zoomPopoverRef.current &&
        !zoomPopoverRef.current.contains(target) &&
        !zoomButtonRef.current?.contains(target)
      ) {
        setShowZoomPopover(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowZoomPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showZoomPopover]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setSlidePan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
    };
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  useEffect(() => {
    setSlidePan({ x: 0, y: 0 });
  }, [slideNumber]);

  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (zoomPercent <= 100) return;
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: slidePan.x,
      panY: slidePan.y,
    };
  };

  const handleSlideWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoomPercent((prev) => {
        const delta = e.deltaY < 0 ? 5 : -5;
        const next = Math.min(200, Math.max(50, prev + delta));
        if (next <= 100) setSlidePan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await pdfFrameRef.current?.requestFullscreen?.();
      }
    } catch {
      // Ignore fullscreen error
    }
  };

  const scrollThumbnailStrip = (direction: -1 | 1) => {
    thumbnailStripRef.current?.scrollBy({
      left: direction * Math.max(320, thumbnailStripRef.current.clientWidth * 0.72),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const strip = thumbnailStripRef.current;
    if (!strip) return;

    const updateScrollButtons = () => {
      setCanScrollThumbnailsLeft(strip.scrollLeft > 2);
      setCanScrollThumbnailsRight(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2);
    };

    updateScrollButtons();
    strip.addEventListener('scroll', updateScrollButtons, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollButtons) : null;
    observer?.observe(strip);
    return () => {
      strip.removeEventListener('scroll', updateScrollButtons);
      observer?.disconnect();
    };
  }, [slideCount]);

  const currentNote = slideNotes[slideNumber] ?? '';

  return {
    fileName,
    isPdf,
    slideContent,
    slideNumber,
    setSlideNumber,
    slideCount,
    pdfDocument,
    powerPointSvg,
    slideLoadError,
    zoomPercent,
    setZoomPercent,
    renderedZoom,
    setRenderedZoom,
    showZoomPopover,
    setShowZoomPopover,
    slidePan,
    setSlidePan,
    isPanning,
    isFullscreen,
    toggleFullscreen,
    handlePanMouseDown,
    handleSlideWheel,
    pdfCanvasRef,
    pdfFrameRef,
    thumbnailStripRef,
    zoomPopoverRef,
    zoomButtonRef,
    canScrollThumbnailsLeft,
    canScrollThumbnailsRight,
    scrollThumbnailStrip,
    slideNotes,
    setSlideNotes,
    currentNote,
    isEditingNote,
    setIsEditingNote,
    noteFontSize,
    setNoteFontSize,
  };
}
