import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { SlidersHorizontal } from 'lucide-react';
import { SpeakerTile } from '../components/SpeakerTile';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/utils/cn';
import { useSubmitPresentation } from '../api/presentation-session';
import { usePresentationSlides, parseSlideNotes } from '../hooks/usePresentationSlides';
import { usePresentationMedia } from '../hooks/usePresentationMedia';
import { useMediaPipeTracking } from '../hooks/useMediaPipeTracking';

export { parseSlideNotes };

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';
type LivePageState = {
  practice?: {
    file?: File;
    slideContent?: string;
    duration?: number;
    criteria?: string[];
    language?: 'vi' | 'en';
    autoStart?: boolean;
    initialTranscript?: string;
  };
};

function clockLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function PdfThumbnail({
  document,
  pageNumber,
  isActive,
  onSelect,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isRendered) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    void document.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 0.24 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({ canvas, canvasContext: context, viewport });
      renderTask.onContinue = (cont: () => void) => {
        requestAnimationFrame(cont);
      };
      return renderTask.promise.then(() => {
        if (!cancelled) setIsRendered(true);
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, isVisible, isRendered]);

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onSelect}
      aria-label={`Chuyển đến trang ${pageNumber}`}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative aspect-video w-52 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isActive
          ? 'border-blue-600 shadow-[0_8px_24px_rgba(37,99,235,0.18)]'
          : 'border-slate-200 opacity-80 hover:border-blue-300 hover:opacity-100'
      }`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full object-contain" />
      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {pageNumber}
      </span>
    </button>
  );
}

function LiveMetric({ icon, label, value, tone = 'violet' }: {
  icon: string;
  label: string;
  value: string;
  tone?: 'violet' | 'emerald' | 'amber' | 'sky';
}) {
  const toneClasses = {
    violet: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon name={icon} className="text-base" />
        </span>
        {label}
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function estimateConfidence(eyeContact: number, posture: number, voiceLevel: number, wordsPerMinute: number, fillers: number) {
  const paceScore = wordsPerMinute === 0 ? 50 : Math.max(35, 100 - Math.abs(wordsPerMinute - 125) * 0.55);
  const volumeScore = voiceLevel === 0 ? 45 : Math.min(95, 55 + voiceLevel * 0.45);
  return Math.round(Math.max(0, Math.min(100, eyeContact * 0.25 + posture * 0.25 + paceScore * 0.2 + volumeScore * 0.2 + Math.max(25, 100 - fillers * 5) * 0.1)));
}

export const PracticeLivePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const submitPresentation = useSubmitPresentation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const file = (location.state as LivePageState | null)?.practice?.file;
  const practice = (location.state as LivePageState | null)?.practice;

  // Custom Hooks
  const slides = usePresentationSlides({
    file,
    initialSlideContent: practice?.slideContent,
  });

  const media = usePresentationMedia();
  const tracking = useMediaPipeTracking();

  const [status, setStatus] = useState<SessionStatus>('ready');
  const [seconds, setSeconds] = useState(0);
  const sessionStartTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const hasAutoStartedRef = useRef(false);
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'live'>('notes');
  const [currentTime, setCurrentTime] = useState(currentTimeLabel);
  const [notesPanelWidth, setNotesPanelWidth] = useState(450);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [transcript] = useState(practice?.initialTranscript ?? '');
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'live' || status === 'paused') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(currentTimeLabel()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // 15-Minute Session Timer: ticks accurately whenever status is 'live'
  useEffect(() => {
    if (status !== 'live') return;

    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = Date.now();
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const currentElapsed = elapsedBeforePauseRef.current + Math.floor((now - (sessionStartTimeRef.current ?? now)) / 1000);
      setSeconds(currentElapsed);

      if (currentElapsed >= 900) {
        finishSession();
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!isResizingNotes) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const maximumWidth = Math.max(360, Math.min(720, window.innerWidth - 560));
      setNotesPanelWidth(Math.max(320, Math.min(maximumWidth, window.innerWidth - event.clientX)));
    };
    const stopResizing = () => setIsResizingNotes(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing, { once: true });

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
    };
  }, [isResizingNotes]);

  const fillers = 0;
  const confidence = tracking.eyeContact > 0 && tracking.posture > 0
    ? estimateConfidence(tracking.eyeContact, tracking.posture, tracking.voiceLevel, tracking.wordsPerMinute, fillers)
    : null;

  // Keyboard Shortcuts (Google Meet standard)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === 'ArrowRight') {
        slides.setSlideNumber((current) => (slides.slideCount ? Math.min(slides.slideCount, current + 1) : current + 1));
      }
      if (event.key === 'ArrowLeft') {
        slides.setSlideNumber((current) => Math.max(1, current - 1));
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        media.toggleMic();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        media.toggleCamera();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slides.slideCount, slides.setSlideNumber, media]);

  useEffect(() => {
    if (media.videoRef.current && media.streamRef.current) {
      if (media.videoRef.current.srcObject !== media.streamRef.current) {
        media.videoRef.current.srcObject = media.streamRef.current;
      }
      void media.videoRef.current.play().catch(() => {});
    }
  }, [status, media.mediaStream]);

  const finishSession = () => {
    sessionStartTimeRef.current = null;
    tracking.stopPerformanceTracking();
    media.stopAudioRecording();
    media.stopTracks();
    media.closeAudioContext();
    setStatus('ended');
  };

  const startSession = async () => {
    if (status === 'starting' || status === 'live') return;
    setStatus('starting');
    media.setCameraError('');
    tracking.resetTrackingMetrics();

    try {
      const stream = await media.initMediaStream();
      const { analyser, audioContext } = media.initAudioAnalyser(stream);
      if (audioContext.state === 'suspended') {
        void audioContext.resume().catch(() => {});
      }
      media.startAudioRecording(stream);

      elapsedBeforePauseRef.current = 0;
      sessionStartTimeRef.current = Date.now();
      setSeconds(0);
      setStatus('live');

      const { faceLandmarker, poseLandmarker } = await tracking.initVisionTasks();

      tracking.startPerformanceTracking({
        video: media.videoRef,
        faceLandmarker,
        poseLandmarker,
        analyser,
        transcriptRef,
        onAutoFinish: finishSession,
      });
    } catch (error) {
      media.stopTracks();
      tracking.stopPerformanceTracking();
      sessionStartTimeRef.current = null;
      setStatus('ready');
      media.setCameraError(error instanceof Error ? `Không thể bắt đầu phiên: ${error.message}` : 'Không thể mở camera hoặc microphone. Hãy kiểm tra quyền truy cập.');
    }
  };

  useEffect(() => {
    if (!practice?.autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    void startSession();
  }, [practice?.autoStart]);

  const pauseSession = () => {
    if (status === 'ready') {
      void startSession();
      return;
    }
    if (status === 'live') {
      if (sessionStartTimeRef.current) {
        elapsedBeforePauseRef.current += Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        sessionStartTimeRef.current = null;
      }
      tracking.pausePerformanceTracking(seconds);
      media.pauseAudioRecording();
      setStatus('paused');
      return;
    }
    if (status === 'paused') {
      sessionStartTimeRef.current = Date.now();
      tracking.resumePerformanceTracking();
      media.resumeAudioRecording();
      setStatus('live');
    }
  };

  const resetSessionTimer = () => {
    elapsedBeforePauseRef.current = 0;
    sessionStartTimeRef.current = status === 'live' ? Date.now() : null;
    setSeconds(0);
    tracking.resetPerformanceTimer(status === 'live');
  };

  const openAIGReview = async () => {
    if (isSubmitting) return;
    setSubmitError(null);

    const finalAudioBlob = media.recordingBlobRef.current || (media.chunksRef.current.length > 0 ? new Blob(media.chunksRef.current, { type: 'audio/webm' }) : null);
    const finalSlideContent = Object.keys(slides.slideNotes).length > 0
      ? Object.entries(slides.slideNotes)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([page, text]) => `[Slide ${page}]:\n${text}`)
          .join('\n\n')
      : (practice?.slideContent || slides.slideContent);

    const durationStr = clockLabel(seconds);

    const formData = new FormData();
    if (finalAudioBlob && finalAudioBlob.size > 1024) {
      const ext = finalAudioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', finalAudioBlob, `presentation-recording.${ext}`);
    }
    formData.append('title', slides.fileName || 'Bài tập thuyết trình');
    formData.append('slide_content', finalSlideContent || '[Chưa có nội dung slide]');
    formData.append('duration', durationStr);
    formData.append('eye_contact_percent', String(tracking.eyeContact ?? 0));
    formData.append('posture_score', String(tracking.posture ?? 0));
    formData.append('language', practice?.language || 'vi');
    if (tracking.wordsPerMinute > 0) formData.append('words_per_minute', String(tracking.wordsPerMinute));
    if (fillers > 0) formData.append('fillers_count', String(fillers));
    if (transcript) formData.append('transcript', transcript);

    try {
      setIsSubmitting(true);
      const res = await submitPresentation.mutateAsync(formData);
      const newSessionId = res.data.id;

      navigate(`/practice/review/${newSessionId}`, {
        state: {
          presentationReview: {
            id: newSessionId,
            audioBlob: finalAudioBlob,
            slideContent: finalSlideContent,
            duration: durationStr,
            wordsPerMinute: tracking.wordsPerMinute || 0,
            fillers: fillers || 0,
            eyeContact: tracking.eyeContact,
            posture: tracking.posture,
            confidence,
            fileName: slides.fileName,
            language: practice?.language || 'vi',
            transcript: transcript || '',
          },
        },
      });
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi khi nộp bài thuyết trình. Vui lòng thử lại.');
    }
  };

  const isActive = status === 'live' || status === 'paused';

  if (!file) return <Navigate to="/practice/setup" replace />;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#eef4fb] font-sans text-slate-800 select-none">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
        style={{ '--notes-panel-width': `${notesPanelWidth}px` } as CSSProperties}
      >
        <section className="flex min-h-[620px] min-w-0 flex-col lg:min-h-0 lg:flex-1" aria-label="Khu vực trình chiếu">
          <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <time className="text-xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-2xl">
                {currentTime}
              </time>
              <span aria-hidden="true" className="h-7 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xl font-semibold tabular-nums tracking-tight sm:text-2xl transition-colors",
                  seconds >= 840 ? "text-rose-600 font-extrabold animate-pulse" : (seconds >= 780 ? "text-amber-600 font-bold" : "text-slate-800")
                )}>
                  {clockLabel(seconds)}
                </span>
                <span className="text-[11px] font-medium text-slate-400">/ 15:00</span>
              </div>
              <button
                type="button"
                onClick={resetSessionTimer}
                disabled={!isActive}
                title="Đặt lại thời gian về 00:00"
                aria-label="Đặt lại thời gian về 00:00"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-blue-950 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Icon name="history" className="text-xl" />
              </button>
              <button
                type="button"
                onClick={pauseSession}
                disabled={!isActive && status !== 'ready'}
                title={status === 'ready' ? 'Bắt đầu' : status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
                aria-label={status === 'ready' ? 'Bắt đầu thuyết trình' : status === 'paused' ? 'Tiếp tục thuyết trình' : 'Tạm dừng thuyết trình'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  status === 'paused' || status === 'ready'
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={status === 'ready' || status === 'paused' ? 'play_arrow' : 'pause'} className="text-xl" />
              </button>
            </div>

            <div className="hidden min-w-0 flex-1 items-center justify-center px-2 md:flex">
              <span className="truncate max-w-xs text-xs font-semibold text-slate-500" title={slides.fileName}>
                {slides.fileName}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={media.toggleMic}
                disabled={!isActive}
                title={media.isMicMuted ? 'Bật micro' : 'Tắt micro'}
                aria-label={media.isMicMuted ? 'Bật micro' : 'Tắt micro'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                  media.isMicMuted
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={media.isMicMuted ? 'mic_off' : 'mic'} className="text-xl" />
              </button>
              <button
                type="button"
                onClick={media.toggleCamera}
                disabled={!isActive}
                title={media.isCameraMuted ? 'Bật camera' : 'Tắt camera'}
                aria-label={media.isCameraMuted ? 'Bật camera' : 'Tắt camera'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                  media.isCameraMuted
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={media.isCameraMuted ? 'videocam_off' : 'videocam'} className="text-xl" />
              </button>
              <button
                type="button"
                onClick={finishSession}
                title="Kết thúc và xem đánh giá"
                aria-label="Kết thúc thuyết trình"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                <Icon name="close" className="text-base" />
                <span>Kết thúc</span>
              </button>
            </div>
          </div>

          <main className="min-h-0 flex-1 bg-[#eef4fb] p-3 sm:p-4">
            <div
              ref={slides.pdfFrameRef}
              onWheel={slides.handleSlideWheel}
              className="group relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden border border-slate-300 bg-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.16)] lg:min-h-0"
            >
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center select-none",
                  slides.zoomPercent > 100 && (slides.isPanning ? "cursor-grabbing" : "cursor-grab")
                )}
                style={{
                  transform: `translate(${slides.slidePan.x}px, ${slides.slidePan.y}px) scale(${slides.zoomPercent / 100})`,
                  transformOrigin: 'center center',
                  transition: slides.isPanning ? 'none' : 'transform 100ms ease-out',
                }}
                onMouseDown={slides.handlePanMouseDown}
              >
                {slides.isPdf && slides.pdfDocument ? (
                  <canvas
                    ref={slides.pdfCanvasRef}
                    aria-label={`Trang ${slides.slideNumber} của ${slides.fileName}`}
                    className="max-h-full max-w-full bg-white object-contain shadow-md"
                  />
                ) : !slides.isPdf && slides.powerPointSvg ? (
                  <iframe
                    title={`Slide ${slides.slideNumber} của ${slides.fileName}`}
                    sandbox=""
                    srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline' data: blob:; font-src data: blob:;"><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#0b0c10;height:100vh;">${slides.powerPointSvg}</body>`}
                    className={cn("h-full w-full border-0 bg-white", (slides.zoomPercent > 100 || slides.isPanning) && "pointer-events-none")}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 text-center text-zinc-400">
                    <Icon name={slides.slideLoadError ? 'error' : 'progress_activity'} className={`text-4xl ${!slides.slideLoadError ? 'animate-spin text-zinc-300' : 'text-rose-300'}`} />
                    <p className="text-sm font-semibold text-zinc-300">
                      {slides.slideLoadError || `Đang tải trang trình chiếu ${slides.isPdf ? 'PDF' : 'PowerPoint'}…`}
                    </p>
                  </div>
                )}
              </div>

              {slides.isPanning && (
                <div className="fixed inset-0 z-50 cursor-grabbing select-none" />
              )}

              <button
                type="button"
                onClick={() => slides.setSlideNumber((current) => Math.max(1, current - 1))}
                disabled={slides.slideNumber <= 1}
                aria-label="Chuyển slide sang trái"
                title="Slide trước"
                className="absolute inset-y-0 left-0 z-10 flex w-[12%] cursor-pointer items-center justify-start pl-3 text-white opacity-0 transition-opacity hover:bg-gradient-to-r hover:from-slate-950/40 hover:to-transparent hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 shadow-lg">
                  <Icon name="chevron_left" className="text-2xl" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => slides.setSlideNumber((current) => (slides.slideCount ? Math.min(slides.slideCount, current + 1) : current + 1))}
                disabled={Boolean(slides.slideCount && slides.slideNumber >= slides.slideCount)}
                aria-label="Chuyển slide sang phải"
                title="Slide tiếp theo"
                className="absolute inset-y-0 right-0 z-10 flex w-[12%] cursor-pointer items-center justify-end pr-3 text-white opacity-0 transition-opacity hover:bg-gradient-to-l hover:from-slate-950/40 hover:to-transparent hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 shadow-lg">
                  <Icon name="chevron_right" className="text-2xl" />
                </span>
              </button>

              <div className={cn(
                "pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between border-t border-white/10 bg-slate-950/90 px-3 text-white shadow-[0_-8px_24px_rgba(15,23,42,0.2)] backdrop-blur transition-[opacity,transform] duration-200 lg:pointer-events-none lg:translate-y-2 lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100",
                slides.showZoomPopover && "lg:pointer-events-auto lg:translate-y-0 lg:opacity-100"
              )}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={slides.slideNumber <= 1}
                    onClick={() => slides.setSlideNumber(1)}
                    title="Về slide đầu tiên"
                    aria-label="Về slide đầu tiên"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="first_page" className="text-lg" />
                  </button>
                  <button
                    type="button"
                    disabled={slides.slideNumber <= 1}
                    onClick={() => slides.setSlideNumber((current) => Math.max(1, current - 1))}
                    title="Trang trước (←)"
                    aria-label="Trang trước"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="chevron_left" className="text-lg" />
                  </button>
                  <span className="min-w-14 px-1 text-center text-xs font-bold tabular-nums">
                    {slides.slideNumber} / {slides.slideCount || 1}
                  </span>
                  <button
                    type="button"
                    disabled={Boolean(slides.slideCount && slides.slideNumber >= slides.slideCount)}
                    onClick={() => slides.setSlideNumber((current) => (slides.slideCount ? Math.min(slides.slideCount, current + 1) : current + 1))}
                    title="Trang sau (→)"
                    aria-label="Trang sau"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="chevron_right" className="text-lg" />
                  </button>

                  <div className="relative">
                    <button
                      ref={slides.zoomButtonRef}
                      type="button"
                      onClick={() => slides.setShowZoomPopover((prev) => !prev)}
                      title="Phóng to / Thu nhỏ slide"
                      aria-label="Phóng to / Thu nhỏ slide"
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15",
                        slides.showZoomPopover && "bg-white/20 text-white"
                      )}
                    >
                      <Icon name="zoom_in" className="text-lg" />
                    </button>

                    {slides.showZoomPopover && (
                      <div
                        ref={slides.zoomPopoverRef}
                        role="region"
                        aria-label="Điều chỉnh thu phóng slide"
                        className="absolute bottom-full left-0 mb-3 z-30 flex h-11 items-center gap-3.5 rounded-full border border-white/15 bg-[#25282d] px-4 py-2 text-white shadow-2xl shadow-black/60 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap"
                      >
                        <input
                          type="range"
                          min={50}
                          max={200}
                          step={5}
                          value={slides.zoomPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            slides.setZoomPercent(val);
                            if (val <= 100) {
                              slides.setSlidePan({ x: 0, y: 0 });
                            }
                          }}
                          onMouseUp={() => slides.setRenderedZoom(slides.zoomPercent)}
                          onTouchEnd={() => slides.setRenderedZoom(slides.zoomPercent)}
                          aria-label="Mức độ thu phóng"
                          className="h-1.5 w-32 sm:w-40 cursor-pointer appearance-none rounded-full bg-[#494c52] accent-white focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                        />
                        <span className="min-w-[42px] text-center text-sm font-bold tabular-nums text-white">
                          {slides.zoomPercent}%
                        </span>
                        <div className="h-4 w-px bg-white/20" />
                        <button
                          type="button"
                          onClick={() => {
                            slides.setZoomPercent(100);
                            slides.setRenderedZoom(100);
                            slides.setSlidePan({ x: 0, y: 0 });
                          }}
                          className="rounded px-1.5 py-0.5 text-sm font-semibold text-slate-200 transition hover:text-white active:scale-95 cursor-pointer"
                        >
                          Vừa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void slides.toggleFullscreen()}
                  title={slides.isFullscreen ? 'Thoát toàn màn hình' : 'Trình chiếu toàn màn hình'}
                  aria-label={slides.isFullscreen ? 'Thoát toàn màn hình' : 'Trình chiếu toàn màn hình'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15"
                >
                  <Icon name={slides.isFullscreen ? 'fullscreen_exit' : 'fullscreen'} className="text-lg" />
                </button>
              </div>
            </div>
          </main>

          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
            <div className="relative">
              {slides.canScrollThumbnailsLeft && <button
                type="button"
                onClick={() => slides.scrollThumbnailStrip(-1)}
                title="Cuộn danh sách slide sang trái"
                aria-label="Cuộn danh sách slide sang trái"
                className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white/95 text-blue-700 shadow-lg transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Icon name="chevron_left" className="text-2xl" />
              </button>}
              <div
                ref={slides.thumbnailStripRef}
                className={`hide-scrollbar flex gap-3 overflow-x-auto pb-1 ${slides.canScrollThumbnailsLeft ? 'pl-12' : 'pl-0'} ${slides.canScrollThumbnailsRight ? 'pr-12' : 'pr-0'}`}
                aria-label="Danh sách trang trình chiếu"
              >
                {slides.isPdf && slides.pdfDocument
                  ? Array.from({ length: slides.slideCount }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PdfThumbnail
                          key={pageNumber}
                          document={slides.pdfDocument!}
                          pageNumber={pageNumber}
                          isActive={slides.slideNumber === pageNumber}
                          onSelect={() => slides.setSlideNumber(pageNumber)}
                        />
                      );
                    })
                  : Array.from({ length: Math.max(1, slides.slideCount) }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => slides.setSlideNumber(pageNumber)}
                          className={`flex aspect-video w-52 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${
                            slides.slideNumber === pageNumber
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.15)]'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          Trang {pageNumber}
                        </button>
                      );
                    })}
              </div>
              {slides.canScrollThumbnailsRight && <button
                type="button"
                onClick={() => slides.scrollThumbnailStrip(1)}
                title="Cuộn danh sách slide sang phải"
                aria-label="Cuộn danh sách slide sang phải"
                className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white/95 text-blue-700 shadow-lg transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Icon name="chevron_right" className="text-2xl" />
              </button>}
            </div>
          </div>
        </section>

        <div
          role="separator"
          aria-label="Thay đổi độ rộng bảng ghi chú"
          aria-orientation="vertical"
          aria-valuemin={320}
          aria-valuemax={720}
          aria-valuenow={notesPanelWidth}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            setIsResizingNotes(true);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            setNotesPanelWidth((current) => Math.max(320, Math.min(720, current + (event.key === 'ArrowLeft' ? 24 : -24))));
          }}
          className={`group/resizer relative hidden w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-blue-100 outline-none transition-colors hover:bg-blue-100 focus-visible:bg-blue-100 lg:flex ${
            isResizingNotes ? 'bg-blue-100' : 'bg-[#eef4fb]'
          }`}
        >
          <span className="h-10 w-1 rounded-full bg-slate-300 transition-colors group-hover/resizer:bg-blue-500" />
        </div>

        <aside
          className="flex min-h-[520px] min-w-0 flex-col border-l border-slate-200 bg-white lg:min-h-0 lg:w-[var(--notes-panel-width)] lg:shrink-0"
          aria-label="Bảng hỗ trợ trình bày"
        >
          <div role="tablist" aria-label="Bảng hỗ trợ trình bày" className="grid grid-cols-2 border-b border-slate-200 px-4 shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'notes'}
              onClick={() => setWorkspaceTab('notes')}
              className={`flex items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition cursor-pointer ${
                workspaceTab === 'notes'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon name="edit_note" className="text-xl" />
              Ghi chú
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'live'}
              aria-label="Thông số"
              title="Thông số"
              onClick={() => setWorkspaceTab('live')}
              className={`flex items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition cursor-pointer ${
                workspaceTab === 'live'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <SlidersHorizontal className="size-4 text-current" />
              Thông số
            </button>
          </div>

          {/* Notes Tab Panel */}
          <div
            role="tabpanel"
            aria-label="Ghi chú trình chiếu"
            className={cn(
              "relative flex min-h-0 flex-1 flex-col select-text",
              workspaceTab !== 'notes' && "hidden"
            )}
          >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    Trang {slides.slideNumber}{slides.slideCount > 0 ? ` / ${slides.slideCount}` : ''}
                  </span>
                  {slides.isEditingNote && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Đang sửa ghi chú
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>
                    {slides.currentNote.trim() ? slides.currentNote.trim().split(/\s+/).length : 0} từ
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {slides.isEditingNote ? (
                  <textarea
                    value={slides.currentNote}
                    onChange={(e) => {
                      const val = e.target.value;
                      slides.setSlideNotes((prev) => ({ ...prev, [slides.slideNumber]: val }));
                    }}
                    aria-label={`Ghi chú trang ${slides.slideNumber}`}
                    placeholder={`Nhập ghi chú cho trang ${slides.slideNumber}...`}
                    style={{ fontSize: `${slides.noteFontSize}px`, lineHeight: 1.75 }}
                    className="h-full min-h-[280px] w-full resize-none rounded-xl border border-blue-200 bg-blue-50/20 p-3.5 font-sans text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                ) : slides.currentNote ? (
                  <div
                    className="whitespace-pre-wrap leading-relaxed text-slate-800 select-text font-sans"
                    style={{ fontSize: `${slides.noteFontSize}px`, lineHeight: 1.75 }}
                  >
                    {slides.currentNote}
                  </div>
                ) : (
                  <div className="flex min-h-64 flex-1 flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Icon name="edit_note" className="text-2xl text-blue-600" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Chưa có ghi chú cho trang này
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                      Nhấn vào biểu tượng bút chì để thêm ghi chú hoặc trích xuất từ tài liệu trình chiếu.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar: Font size adjustment and edit note controls (below content, preventing occlusion) */}
              <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50/90 px-4 py-2.5 sm:px-5">
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => slides.setNoteFontSize((current) => Math.max(14, current - 2))}
                    disabled={slides.noteFontSize <= 14}
                    title="Giảm kích thước chữ"
                    aria-label="Giảm kích thước chữ ghi chú"
                    className="flex h-9 w-9 items-center justify-center text-blue-950 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Icon name="remove" className="text-base" />
                  </button>
                  <button
                    type="button"
                    onClick={() => slides.setNoteFontSize(16)}
                    title="Đặt lại kích thước chữ"
                    aria-label="Đặt lại kích thước chữ ghi chú"
                    className="flex h-9 min-w-10 items-center justify-center border-x border-slate-200 px-2 text-xs font-semibold text-blue-950 transition hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                  >
                    aA
                  </button>
                  <button
                    type="button"
                    onClick={() => slides.setNoteFontSize((current) => Math.min(24, current + 2))}
                    disabled={slides.noteFontSize >= 24}
                    title="Tăng kích thước chữ"
                    aria-label="Tăng kích thước chữ ghi chú"
                    className="flex h-9 w-9 items-center justify-center text-blue-950 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Icon name="add" className="text-base" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => slides.setIsEditingNote((current) => !current)}
                  title={slides.isEditingNote ? 'Xong chỉnh sửa' : 'Chỉnh sửa ghi chú'}
                  aria-label="Chỉnh sửa ghi chú"
                  aria-pressed={slides.isEditingNote}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    slides.isEditingNote
                      ? 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'border-slate-200 bg-white text-blue-950 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <Icon name={slides.isEditingNote ? 'check' : 'edit'} className="text-base" />
                  <span>{slides.isEditingNote ? 'Xong' : 'Sửa ghi chú'}</span>
                </button>
              </div>
            </div>

            {/* Parameters Tab Panel ("Thông số") */}
            <div
              role="tabpanel"
              aria-label="Thông số trực tiếp"
              className={cn(
                "min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-4",
                workspaceTab !== 'live' && "hidden"
              )}
            >
              <SpeakerTile
                videoRef={media.videoRef}
                poseCanvasRef={tracking.poseCanvasRef}
                stream={media.mediaStream}
                isActive={isActive}
                voiceLevel={tracking.voiceLevel}
                eyeContact={tracking.eyeContact}
                posture={tracking.posture}
                cameraGuidance={tracking.cameraGuidance}
                cameraError={media.cameraError || tracking.trackingError}
                faceMissing={tracking.faceMissing}
                status={status}
                isMicMuted={media.isMicMuted}
                isCameraMuted={media.isCameraMuted}
                showSkeleton={tracking.showSkeleton}
                onToggleSkeleton={() => tracking.setShowSkeleton((current) => !current)}
                className="shadow-md"
              />

              <div className="grid grid-cols-2 gap-3">
                <LiveMetric icon="visibility" label="Giao tiếp mắt" value={`${tracking.eyeContact || 0}%`} tone="sky" />
                <LiveMetric icon="accessibility_new" label="Tư thế" value={`${tracking.posture || 0}%`} tone="emerald" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-600">Mức giọng nói</span>
                  <span className="text-xs font-bold tabular-nums text-blue-700">{tracking.voiceLevel}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-600 transition-[width] duration-200" style={{ width: `${tracking.voiceLevel}%` }} />
                </div>
              </div>
            </div>
        </aside>
      </div>



      {/* Session Completed Summary Modal */}
      <Dialog open={status === 'ended'} onOpenChange={(open) => { if (!open) navigate('/home'); }}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 text-slate-800 shadow-2xl gap-5">
          <DialogHeader className="gap-1.5 pb-1 text-left">
            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50/80 text-blue-700 text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              Bản trình bày đã kết thúc
            </Badge>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
              Tóm tắt phiên thuyết trình
            </DialogTitle>
            <DialogDescription className="sr-only">
              Tóm tắt nhanh chỉ số phiên thuyết trình
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              {
                label: 'Thời gian',
                value: clockLabel(seconds),
                icon: 'timer',
                accent: 'border-blue-200 bg-blue-100/60 text-blue-700',
              },
              {
                label: 'Giao tiếp mắt',
                value: `${tracking.eyeContact || 0}%`,
                icon: 'visibility',
                accent: 'border-sky-200 bg-sky-100/60 text-sky-700',
              },
              {
                label: 'Tư thế',
                value: `${tracking.posture || 0}%`,
                icon: 'accessibility_new',
                accent: 'border-emerald-200 bg-emerald-100/60 text-emerald-700',
              },
            ].map((metric) => (
              <Card key={metric.label} size="sm" className="border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all">
                <CardContent className="flex flex-col justify-between p-3 sm:p-3.5 h-full gap-2 sm:gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate" title={metric.label}>{metric.label}</span>
                    <span className={cn('flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg border', metric.accent)}>
                      <Icon name={metric.icon} className="text-xs sm:text-sm" />
                    </span>
                  </div>
                  <p className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {submitError}
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 -mt-1 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 rounded-b-3xl">
            {media.recordingUrl ? (
              <a
                href={media.recordingUrl}
                download="softskill-presentation.webm"
                className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 gap-1.5')}
              >
                <Icon name="download" className="text-sm" /> Tải bản ghi
              </a>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => navigate('/home')}
                className="rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Về trang chủ
              </Button>
              <Button
                type="button"
                size="default"
                disabled={isSubmitting}
                onClick={openAIGReview}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 px-5 transition-all active:scale-95 gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="progress_activity" className="text-sm animate-spin" />
                    <span>Đang gửi bài...</span>
                  </>
                ) : (
                  <>
                    <span>Chuyển AI chấm bài</span>
                    <Icon name="arrow_forward" className="text-sm" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
