import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Presentation } from '@web-ppt/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractSlideText } from '../lib/slide';
import { SpeakerTile } from '../components/Presentation/SpeakerTile';
import { AppIcon as Icon } from '../components/Common/AppIcon';

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';
type LivePageState = {
  practice?: {
    file?: File;
    slideContent?: string;
    duration?: number;
    criteria?: string[];
    language?: 'vi' | 'en';
    autoStart?: boolean;
  };
};
type VoiceRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type VoiceRecognitionEvent = { resultIndex: number; results: ArrayLike<VoiceRecognitionResult> };
interface LocalVoiceRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => LocalVoiceRecognition;
  webkitSpeechRecognition?: new () => LocalVoiceRecognition;
};

const VI_FILLER_WORDS = ['ừm', 'ừ', 'ờ', 'à', 'kiểu như', 'nói chung là', 'thì là', 'uh', 'um'];
const EN_FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of'];

function countFillers(transcript: string, language: 'vi' | 'en' = 'vi') {
  const normalized = transcript.toLocaleLowerCase(language === 'en' ? 'en-US' : 'vi-VN');
  const fillerList = language === 'en' ? EN_FILLER_WORDS : VI_FILLER_WORDS;
  return fillerList.reduce((total, filler) => {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = normalized.match(new RegExp(`(?:^|[\\s,.;!?])${escaped}(?=$|[\\s,.;!?])`, 'gu'));
    return total + (matches?.length ?? 0);
  }, 0);
}

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

function notesForSlide(content: string, slideNumber: number) {
  const normalized = content.trim();
  if (!normalized) return '';

  const slideMarker = /\[(?:Slide|Trang)\s+\d+\]:/i;
  if (!slideMarker.test(normalized)) return normalized;

  const sections = normalized.split(/\n{2,}(?=\[(?:Slide|Trang)\s+\d+\]:)/i);
  const currentMarker = new RegExp(`^\\[(?:Slide|Trang)\\s+${slideNumber}\\]:\\s*`, 'i');
  const currentSection = sections.find((section) => currentMarker.test(section.trim()));
  return currentSection?.trim().replace(currentMarker, '').trim() ?? '';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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
      return renderTask.promise;
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return (
    <button
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
  const file = (location.state as LivePageState | null)?.practice?.file;
  const practice = (location.state as LivePageState | null)?.practice;
  const [slideContent, setSlideContent] = useState(practice?.slideContent ?? '');

  useEffect(() => {
    if (practice?.slideContent) {
      setSlideContent(practice.slideContent);
    } else if (file) {
      void extractSlideText(file).then((text) => setSlideContent(text));
    }
  }, [file, practice?.slideContent]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfFrameRef = useRef<HTMLDivElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const presentationRef = useRef<Presentation | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const recognitionRef = useRef<LocalVoiceRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const trackingFrameRef = useRef<FrameRequestCallback | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const runRef = useRef(false);
  const transcriptRef = useRef('');
  const previousHandsRef = useRef<{ leftX: number; leftY: number; rightX: number; rightY: number } | null>(null);
  const lastGestureAtRef = useRef(0);
  const postureSamplesRef = useRef<number[]>([]);
  const eyeSamplesRef = useRef<number[]>([]);
  const recognitionBaseRef = useRef('');
  const recognitionFinalRef = useRef('');
  const faceMissingFramesRef = useRef(0);
  const restartTimeoutRef = useRef<number | null>(null);
  const restartOnEndRef = useRef(true);
  const isMicMutedRef = useRef(false);

  const [status, setStatus] = useState<SessionStatus>('ready');
  const [, setSpeechError] = useState('');
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [slideNumber, setSlideNumber] = useState(1);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [powerPointSvg, setPowerPointSvg] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [canScrollThumbnailsLeft, setCanScrollThumbnailsLeft] = useState(false);
  const [canScrollThumbnailsRight, setCanScrollThumbnailsRight] = useState(false);
  const [slideLoadError, setSlideLoadError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(0);
  const [eyeContact, setEyeContact] = useState(0);
  const [posture, setPosture] = useState(0);
  const [cameraGuidance, setCameraGuidance] = useState('Đang tìm khuôn mặt…');
  const [, setGestureCount] = useState(0);
  const [, setGestureFeedback] = useState('Đang phân tích cử chỉ…');
  const [faceMissing, setFaceMissing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'live'>('notes');
  const [currentTime, setCurrentTime] = useState(currentTimeLabel);
  const [notesPanelWidth, setNotesPanelWidth] = useState(450);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [noteFontSize, setNoteFontSize] = useState(16);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(currentTimeLabel()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const fillers = countFillers(transcript, practice?.language);
  const confidence = eyeContact > 0 && posture > 0 ? estimateConfidence(eyeContact, posture, voiceLevel, wordsPerMinute, fillers) : null;
  const fileName = file?.name ?? 'hung_dung_do_an_tot_nghiep.pdf';
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  const extractedSlideNotes = notesForSlide(slideContent, slideNumber);
  const activeSlideNotes = noteDrafts[slideNumber] ?? extractedSlideNotes;

  const stopRecognition = () => {
    restartOnEndRef.current = false;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {
        /* Ignore cleanup errors */
      }
      recognitionRef.current = null;
    }
  };

  const startLocalRecognition = () => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError('Trình duyệt không hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    stopRecognition();

    try {
      const recognition = new Recognition();
      recognition.lang = practice?.language === 'en' ? 'en-US' : 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      restartOnEndRef.current = true;
      setSpeechError('');

      recognition.onresult = (event) => {
        const finalParts: string[] = [];
        const interimParts: string[] = [];
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const phrase = result?.[0]?.transcript?.trim();
          if (!phrase) continue;
          if (result.isFinal) {
            finalParts.push(phrase);
          } else {
            interimParts.push(phrase);
          }
        }
        recognitionFinalRef.current = [recognitionBaseRef.current, finalParts.join(' ')].filter(Boolean).join(' ').trim();
        const liveTranscript = [recognitionFinalRef.current, interimParts.join(' ')].filter(Boolean).join(' ').trim();
        transcriptRef.current = liveTranscript;
        setTranscript(liveTranscript);
      };

      recognition.onerror = (event) => {
        const error = event.error;
        if (error === 'no-speech') {
          // Normal silence timeout in Chromium; onend will restart if still live.
          return;
        }
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          restartOnEndRef.current = false;
          setSpeechError('Quyền nhận diện giọng nói bị từ chối hoặc bị hạn chế trên trình duyệt.');
          return;
        }
        if (error === 'language-not-supported' || error === 'language-unavailable') {
          restartOnEndRef.current = false;
          setSpeechError('Ngôn ngữ nhận dạng không được hỗ trợ trên trình duyệt này.');
          return;
        }
        if (error === 'network') {
          setSpeechError('Lỗi kết nối dịch vụ nhận dạng giọng nói. Đang thử lại...');
          return;
        }
        if (error === 'aborted') {
          return;
        }
      };

      recognition.onend = () => {
        recognitionBaseRef.current = recognitionFinalRef.current || recognitionBaseRef.current;
        transcriptRef.current = recognitionBaseRef.current;
        setTranscript(recognitionBaseRef.current);

        if (runRef.current && !isMicMutedRef.current && restartOnEndRef.current) {
          if (restartTimeoutRef.current !== null) {
            window.clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = window.setTimeout(() => {
            if (runRef.current && !isMicMutedRef.current && restartOnEndRef.current) {
              startLocalRecognition();
            }
          }, 250);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      if (runRef.current && !isMicMutedRef.current && restartOnEndRef.current) {
        if (restartTimeoutRef.current !== null) {
          window.clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = window.setTimeout(() => {
          if (runRef.current && !isMicMutedRef.current) {
            startLocalRecognition();
          }
        }, 500);
      }
    }
  };

  // Mute / Unmute Track Handlers
  const toggleMic = () => {
    const willBeMuted = !isMicMuted;
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
    }
    setIsMicMuted(willBeMuted);
    isMicMutedRef.current = willBeMuted;

    if (willBeMuted) {
      stopRecognition();
    } else if (status === 'live') {
      startLocalRecognition();
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      const willBeMuted = !isCameraMuted;
      videoTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
      setIsCameraMuted(willBeMuted);
    }
  };

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
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: cssScale });
        const context = canvas.getContext('2d');
        if (!context) return;
        renderTask?.cancel();
        canvas.width = Math.round(viewport.width * pixelRatio);
        canvas.height = Math.round(viewport.height * pixelRatio);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setSlideLoadError('Không thể hiển thị trang PDF này.');
        }
      }
    };
    const observer = new ResizeObserver(() => void renderCurrentPage());
    observer.observe(pdfFrameRef.current);
    void renderCurrentPage();
    return () => {
      cancelled = true;
      observer.disconnect();
      renderTask?.cancel();
    };
  }, [pdfDocument, slideNumber]);

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
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [status]);

  useEffect(() => () => {
    runRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    stopRecognition();
    if (recordingRef.current?.state === 'recording' || recordingRef.current?.state === 'paused') recordingRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    faceLandmarkerRef.current?.close();
    poseLandmarkerRef.current?.close();
    void audioContextRef.current?.close();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
  }, []);

  // Keyboard Shortcuts (Google Meet standard)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === 'ArrowRight') {
        setSlideNumber((current) => (slideCount ? Math.min(slideCount, current + 1) : current + 1));
      }
      if (event.key === 'ArrowLeft') {
        setSlideNumber((current) => Math.max(1, current - 1));
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleMic();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        toggleCamera();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slideCount, isMicMuted, isCameraMuted]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startSession = async () => {
    if (status === 'starting' || status === 'live') return;
    setStatus('starting');
    setCameraError('');
    setFaceMissing(false);
    faceMissingFramesRef.current = 0;
    previousHandsRef.current = null;
    postureSamplesRef.current = [];
    eyeSamplesRef.current = [];
    setGestureCount(0);
    try {
      const stream = streamRef.current ?? await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const visionModule = await import('@mediapipe/tasks-vision');
      const vision = await visionModule.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm');
      const [faceLandmarker, poseLandmarker] = await Promise.all([
        visionModule.FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
        }),
        visionModule.PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
      ]);
      faceLandmarkerRef.current = faceLandmarker;
      poseLandmarkerRef.current = poseLandmarker;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      chunksRef.current = [];
      const audioOnlyStream = new MediaStream(stream.getAudioTracks());
      const recorder = new MediaRecorder(
        audioOnlyStream,
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined,
      );
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const recording = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (recording.size > 0) {
          const objectUrl = URL.createObjectURL(recording);
          recordingUrlRef.current = objectUrl;
          setRecordingUrl(objectUrl);
        }
      };
      recordingRef.current = recorder;
      recorder.start(1000);
      runRef.current = true;
      startedAtRef.current = performance.now();
      elapsedBeforePauseRef.current = 0;
      setSeconds(0);
      setStatus('live');
      startLocalRecognition();

      let lastRun = 0;
      let previousTimestamp = 0;
      let lastWords = transcriptRef.current ? transcriptRef.current.split(/\s+/).length : 0;
      const wordSamples: Array<{ at: number; count: number }> = [{ at: performance.now(), count: lastWords }];
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const trackPerformance = (now: number) => {
        if (!runRef.current) return;
        if (now - lastRun >= 220) {
          lastRun = now;
          const video = videoRef.current;
          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - previousTimestamp >= 180) {
            previousTimestamp = now;
            try {
              const faceResult = faceLandmarker.detectForVideo(video, now);
              const landmarks = faceResult.faceLandmarks[0];
              if (landmarks?.length) {
                faceMissingFramesRef.current = 0;
                setFaceMissing(false);
                const xValues = landmarks.map((point) => point.x);
                const yValues = landmarks.map((point) => point.y);
                const faceWidth = Math.max(...xValues) - Math.min(...xValues);
                const faceCenterX = (Math.min(...xValues) + Math.max(...xValues)) / 2;
                const faceCenterY = (Math.min(...yValues) + Math.max(...yValues)) / 2;
                setCameraGuidance(
                  faceCenterX < 0.28 || faceCenterX > 0.72 || faceCenterY < 0.12 || faceCenterY > 0.78
                    ? 'Đưa khuôn mặt vào giữa khung'
                    : faceWidth > 0.4
                    ? 'Hơi gần — lùi ra một chút'
                    : faceWidth < 0.14
                    ? 'Hơi xa — tiến lại gần'
                    : 'Vị trí và khoảng cách tốt',
                );
                const irisPositions = [
                  { iris: landmarks[468], outer: landmarks[33], inner: landmarks[133] },
                  { iris: landmarks[473], outer: landmarks[362], inner: landmarks[263] },
                ];
                const focused = irisPositions.filter(({ iris, outer, inner }) => {
                  if (!iris || !outer || !inner) return false;
                  const ratio = (iris.x - Math.min(outer.x, inner.x)) / Math.max(0.001, Math.abs(inner.x - outer.x));
                  return ratio >= 0.28 && ratio <= 0.72;
                }).length;
                eyeSamplesRef.current.push(Math.round((focused / irisPositions.length) * 100));
                if (eyeSamplesRef.current.length > 150) eyeSamplesRef.current.shift();
                setEyeContact(Math.round(eyeSamplesRef.current.reduce((sum, value) => sum + value, 0) / eyeSamplesRef.current.length));
              } else {
                faceMissingFramesRef.current += 1;
                if (faceMissingFramesRef.current >= 3) {
                  setFaceMissing(true);
                  setCameraGuidance('Không thấy khuôn mặt — quay lại khung hình');
                  setEyeContact(0);
                  setPosture(0);
                  eyeSamplesRef.current = [];
                  postureSamplesRef.current = [];
                  setGestureFeedback('Không thấy người trong khung hình');
                }
              }

              const pose = poseLandmarker.detectForVideo(video, now).landmarks[0];
              const canvas = poseCanvasRef.current;
              const context = canvas?.getContext('2d');
              if (canvas && context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.clearRect(0, 0, canvas.width, canvas.height);
                if (pose) {
                  const links = [
                    [0, 11], [0, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
                  ];
                  context.strokeStyle = 'rgba(138, 180, 248, .85)';
                  context.lineWidth = Math.max(3, canvas.width / 260);
                  for (const [start, end] of links) {
                    const first = pose[start];
                    const second = pose[end];
                    if (!first || !second || (first.visibility ?? 1) < 0.4 || (second.visibility ?? 1) < 0.4) continue;
                    context.beginPath();
                    context.moveTo(first.x * canvas.width, first.y * canvas.height);
                    context.lineTo(second.x * canvas.width, second.y * canvas.height);
                    context.stroke();
                  }
                  context.fillStyle = '#8ab4f8';
                  for (const point of pose.slice(0, 17)) {
                    if ((point.visibility ?? 1) < 0.4) continue;
                    context.beginPath();
                    context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(3, canvas.width / 180), 0, Math.PI * 2);
                    context.fill();
                  }
                }
              }
              if (pose?.[11] && pose[12] && pose[23] && pose[24]) {
                const shoulderWidth = Math.max(0.08, Math.abs(pose[11].x - pose[12].x));
                const shoulderTilt = Math.abs(pose[11].y - pose[12].y) / shoulderWidth;
                const shoulderMid = (pose[11].x + pose[12].x) / 2;
                const hipMid = (pose[23].x + pose[24].x) / 2;
                const torsoLength = Math.max(0.1, Math.abs((pose[23].y + pose[24].y) / 2 - (pose[11].y + pose[12].y) / 2));
                const lean = Math.abs(shoulderMid - hipMid) / torsoLength;
                const postureScore = Math.round(Math.max(25, Math.min(100, 100 - shoulderTilt * 38 - lean * 40)));
                postureSamplesRef.current.push(postureScore);
                if (postureSamplesRef.current.length > 150) postureSamplesRef.current.shift();
                setPosture(Math.round(postureSamplesRef.current.reduce((sum, value) => sum + value, 0) / postureSamplesRef.current.length));
                const leftWrist = pose[15];
                const rightWrist = pose[16];
                const leftVisible = Boolean(leftWrist && (leftWrist.visibility ?? 1) > 0.5);
                const rightVisible = Boolean(rightWrist && (rightWrist.visibility ?? 1) > 0.5);
                if (leftVisible && rightVisible && leftWrist && rightWrist) {
                  const previous = previousHandsRef.current;
                  const hasExpressiveMovement = previous && (
                    Math.hypot(leftWrist.x - previous.leftX, leftWrist.y - previous.leftY) > 0.06
                    || Math.hypot(rightWrist.x - previous.rightX, rightWrist.y - previous.rightY) > 0.06
                  );
                  const waistY = (pose[23].y + pose[24].y) / 2;
                  const handsInGestureZone = leftWrist.y < waistY || rightWrist.y < waistY;
                  if (hasExpressiveMovement && handsInGestureZone && now - lastGestureAtRef.current > 850) {
                    lastGestureAtRef.current = now;
                    setGestureCount((count) => count + 1);
                  }
                  setGestureFeedback(handsInGestureZone ? 'Tay linh hoạt trong vùng nói' : 'Thả lỏng & nâng tay nhẹ');
                  previousHandsRef.current = { leftX: leftWrist.x, leftY: leftWrist.y, rightX: rightWrist.x, rightY: rightWrist.y };
                } else {
                  previousHandsRef.current = null;
                  setGestureFeedback('Đưa tay vào khung hình để theo dõi');
                }
              } else {
                previousHandsRef.current = null;
                setPosture(0);
                setGestureFeedback('Đưa phần thân trên vào khung hình');
              }
            } catch {
              setCameraError('Đang xử lý phân tích hình ảnh.');
            }
          }
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((total, sample) => total + (sample - 128) ** 2, 0) / samples.length);
          setVoiceLevel(Math.min(100, Math.round(rms * 1.8)));

          const elapsed = elapsedBeforePauseRef.current + Math.floor((performance.now() - (startedAtRef.current ?? performance.now())) / 1000);
          setSeconds(elapsed);
          const currentWords = transcriptRef.current ? transcriptRef.current.split(/\s+/).length : 0;
          if (currentWords !== lastWords) {
            lastWords = currentWords;
            wordSamples.push({ at: performance.now(), count: currentWords });
          }
          const cutoff = performance.now() - 12_000;
          while (wordSamples.length > 2 && wordSamples[1].at < cutoff) wordSamples.shift();
          const oldestSample = wordSamples[0];
          const sampleDuration = performance.now() - oldestSample.at;
          if (sampleDuration >= 1_000) {
            const measuredWords = Math.max(0, currentWords - oldestSample.count);
            setWordsPerMinute(Math.round((measuredWords * 60_000) / sampleDuration));
          }
        }
        frameRef.current = requestAnimationFrame(trackPerformance);
      };
      trackingFrameRef.current = trackPerformance;
      frameRef.current = requestAnimationFrame(trackPerformance);
    } catch (error) {
      stopTracks();
      faceLandmarkerRef.current?.close();
      poseLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
      poseLandmarkerRef.current = null;
      setStatus('ready');
      setCameraError(error instanceof Error ? `Không thể bắt đầu phiên: ${error.message}` : 'Không thể mở camera hoặc microphone. Hãy kiểm tra quyền truy cập.');
    }
  };

  useEffect(() => {
    if (!practice?.autoStart) return;
    let cancelled = false;

    void navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    }).then((stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
      setStartCountdown(5);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setCameraError(error instanceof Error
        ? `Không thể mở camera hoặc microphone: ${error.message}`
        : 'Không thể mở camera hoặc microphone. Hãy kiểm tra quyền truy cập.');
    });

    return () => {
      cancelled = true;
    };
  }, [practice?.autoStart]);

  useEffect(() => {
    if (startCountdown === null) return;
    if (startCountdown === 0) {
      setStartCountdown(null);
      void startSession();
      return;
    }
    const timer = window.setTimeout(() => setStartCountdown((count) => count === null ? null : count - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [startCountdown]);

  if (!file) return <Navigate to="/practice/setup" replace />;

  const pauseSession = () => {
    if (status === 'live') {
      runRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      elapsedBeforePauseRef.current = seconds;
      stopRecognition();
      if (recordingRef.current?.state === 'recording') recordingRef.current.pause();
      setStatus('paused');
      return;
    }
    if (status === 'paused') {
      runRef.current = true;
      startedAtRef.current = performance.now();
      if (recordingRef.current?.state === 'paused') recordingRef.current.resume();
      setStatus('live');
      if (!isMicMutedRef.current) {
        startLocalRecognition();
      }
      if (trackingFrameRef.current) frameRef.current = requestAnimationFrame(trackingFrameRef.current);
    }
  };

  const resetSessionTimer = () => {
    elapsedBeforePauseRef.current = 0;
    setSeconds(0);
    if (status === 'live') {
      startedAtRef.current = performance.now();
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
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(strip);
    return () => {
      strip.removeEventListener('scroll', updateScrollButtons);
      observer.disconnect();
    };
  }, [slideCount]);

  const updateActiveSlideNote = (value: string) => {
    setNoteDrafts((current) => ({ ...current, [slideNumber]: value }));
  };

  const finishSession = () => {
    runRef.current = false;
    stopRecognition();
    recordingRef.current?.stop();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    faceLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
    stopTracks();
    void audioContextRef.current?.close();
    setStatus('ended');
  };

  const openAIGReview = () => navigate('/practice/review', {
    state: {
      presentationReview: {
        slideContent: practice?.slideContent || slideContent,
        transcript,
        duration: clockLabel(seconds),
        wordsPerMinute,
        fillers,
        eyeContact,
        posture,
        confidence,
        fileName,
        language: practice?.language || 'vi',
      },
    },
  });

  const isActive = status === 'live' || status === 'paused';

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
              <span className="text-xl font-semibold tabular-nums tracking-tight text-slate-800 sm:text-2xl">
                {clockLabel(seconds)}
              </span>
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
                disabled={!isActive}
                title={status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
                aria-label={status === 'paused' ? 'Tiếp tục thuyết trình' : 'Tạm dừng thuyết trình'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  status === 'paused'
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={status === 'paused' ? 'play_arrow' : 'pause'} className="text-xl" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                disabled={!isActive}
                title={isMicMuted ? 'Bật micro' : 'Tắt micro'}
                aria-label={isMicMuted ? 'Bật micro' : 'Tắt micro'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                  isMicMuted
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={isMicMuted ? 'mic_off' : 'mic'} className="text-xl" />
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                disabled={!isActive}
                title={isCameraMuted ? 'Bật camera' : 'Tắt camera'}
                aria-label={isCameraMuted ? 'Bật camera' : 'Tắt camera'}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-35 ${
                  isCameraMuted
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon name={isCameraMuted ? 'videocam_off' : 'videocam'} className="text-xl" />
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
              ref={pdfFrameRef}
              className="group relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden border border-slate-300 bg-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.16)] lg:min-h-0"
            >
              {isPdf && pdfDocument ? (
                <canvas
                  ref={pdfCanvasRef}
                  aria-label={`Trang ${slideNumber} của ${fileName}`}
                  className="max-h-full max-w-full bg-white object-contain"
                />
              ) : !isPdf && powerPointSvg ? (
                <iframe
                  title={`Slide ${slideNumber} của ${fileName}`}
                  sandbox=""
                  srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline' data: blob:; font-src data: blob:;"><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#0b0c10;height:100vh;">${powerPointSvg}</body>`}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-zinc-400">
                  <Icon name={slideLoadError ? 'error' : 'progress_activity'} className={`text-4xl ${!slideLoadError ? 'animate-spin text-zinc-300' : 'text-rose-300'}`} />
                  <p className="text-sm font-semibold text-zinc-300">
                    {slideLoadError || `Đang tải trang trình chiếu ${isPdf ? 'PDF' : 'PowerPoint'}…`}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSlideNumber((current) => Math.max(1, current - 1))}
                disabled={slideNumber <= 1}
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
                onClick={() => setSlideNumber((current) => (slideCount ? Math.min(slideCount, current + 1) : current + 1))}
                disabled={Boolean(slideCount && slideNumber >= slideCount)}
                aria-label="Chuyển slide sang phải"
                title="Slide tiếp theo"
                className="absolute inset-y-0 right-0 z-10 flex w-[12%] cursor-pointer items-center justify-end pr-3 text-white opacity-0 transition-opacity hover:bg-gradient-to-l hover:from-slate-950/40 hover:to-transparent hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 shadow-lg">
                  <Icon name="chevron_right" className="text-2xl" />
                </span>
              </button>

              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between border-t border-white/10 bg-slate-950/90 px-3 text-white shadow-[0_-8px_24px_rgba(15,23,42,0.2)] backdrop-blur transition-[opacity,transform] duration-200 lg:pointer-events-none lg:translate-y-2 lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={slideNumber <= 1}
                    onClick={() => setSlideNumber(1)}
                    title="Về slide đầu tiên"
                    aria-label="Về slide đầu tiên"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="first_page" className="text-lg" />
                  </button>
                  <button
                    type="button"
                    disabled={slideNumber <= 1}
                    onClick={() => setSlideNumber((current) => Math.max(1, current - 1))}
                    title="Trang trước (←)"
                    aria-label="Trang trước"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="chevron_left" className="text-lg" />
                  </button>
                  <span className="min-w-14 px-1 text-center text-xs font-bold tabular-nums">
                    {slideNumber} / {slideCount || 1}
                  </span>
                  <button
                    type="button"
                    disabled={Boolean(slideCount && slideNumber >= slideCount)}
                    onClick={() => setSlideNumber((current) => (slideCount ? Math.min(slideCount, current + 1) : current + 1))}
                    title="Trang sau (→)"
                    aria-label="Trang sau"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Icon name="chevron_right" className="text-lg" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void pdfFrameRef.current?.requestFullscreen?.()}
                  title="Trình chiếu toàn màn hình"
                  aria-label="Trình chiếu toàn màn hình"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/15"
                >
                  <Icon name="fullscreen" className="text-lg" />
                </button>
              </div>
            </div>
          </main>

          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
            <div className="relative">
              {canScrollThumbnailsLeft && <button
                type="button"
                onClick={() => scrollThumbnailStrip(-1)}
                title="Cuộn danh sách slide sang trái"
                aria-label="Cuộn danh sách slide sang trái"
                className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white/95 text-blue-700 shadow-lg transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Icon name="chevron_left" className="text-2xl" />
              </button>}
              <div
                ref={thumbnailStripRef}
                className={`hide-scrollbar flex gap-3 overflow-x-auto pb-1 ${canScrollThumbnailsLeft ? 'pl-12' : 'pl-0'} ${canScrollThumbnailsRight ? 'pr-12' : 'pr-0'}`}
                aria-label="Danh sách trang trình chiếu"
              >
                {isPdf && pdfDocument
                  ? Array.from({ length: slideCount }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PdfThumbnail
                          key={pageNumber}
                          document={pdfDocument}
                          pageNumber={pageNumber}
                          isActive={slideNumber === pageNumber}
                          onSelect={() => setSlideNumber(pageNumber)}
                        />
                      );
                    })
                  : Array.from({ length: Math.max(1, slideCount) }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setSlideNumber(pageNumber)}
                          className={`flex aspect-video w-52 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold transition ${
                            slideNumber === pageNumber
                              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_8px_24px_rgba(37,99,235,0.15)]'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          Trang {pageNumber}
                        </button>
                      );
                    })}
              </div>
              {canScrollThumbnailsRight && <button
                type="button"
                onClick={() => scrollThumbnailStrip(1)}
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
          aria-label="Ghi chú và phân tích trực tiếp"
        >
          <div role="tablist" aria-label="Bảng hỗ trợ trình bày" className="grid grid-cols-2 border-b border-slate-200 px-4">
            <button
              type="button"
              role="tab"
              aria-selected={workspaceTab === 'notes'}
              onClick={() => setWorkspaceTab('notes')}
              className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
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
              aria-label="Xem bản thân và nhận xét trực tiếp từ AI"
              title="Xem bản thân và nhận xét trực tiếp từ AI"
              onClick={() => setWorkspaceTab('live')}
              className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
                workspaceTab === 'live'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon name="smart_toy" className="text-xl" />
              AI nhận xét
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {workspaceTab === 'notes' ? (
              <div role="tabpanel" aria-label={`Ghi chú slide ${slideNumber}`} className="flex min-h-full flex-col gap-4 select-text">
                <div className="flex min-h-64 flex-1">
                  {isEditingNote ? (
                    <textarea
                      autoFocus
                      value={activeSlideNotes}
                      onChange={(event) => updateActiveSlideNote(event.target.value)}
                      placeholder="Nhập nội dung ghi chú cho slide này…"
                      aria-label={`Chỉnh sửa ghi chú slide ${slideNumber}`}
                      className="min-h-64 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      style={{ fontSize: `${noteFontSize}px`, lineHeight: 1.65 }}
                    />
                  ) : activeSlideNotes ? (
                    <p className="whitespace-pre-wrap text-slate-800" style={{ fontSize: `${noteFontSize}px`, lineHeight: 1.65 }}>
                      {activeSlideNotes}
                    </p>
                  ) : (
                    <div className="flex min-h-64 flex-1 flex-col items-center justify-center text-center">
                      <Icon name="notes" className="text-3xl text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">Slide này chưa có nội dung ghi chú</p>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                        Nhấn nút chỉnh sửa để thêm nội dung trình bày cho slide này.
                      </p>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white pt-3">
                  <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setNoteFontSize((current) => Math.max(14, current - 2))}
                      disabled={noteFontSize <= 14}
                      title="Giảm kích thước chữ"
                      aria-label="Giảm kích thước chữ ghi chú"
                      className="flex h-10 w-10 items-center justify-center text-blue-950 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35"
                    >
                      <Icon name="remove" className="text-lg" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFontSize(16)}
                      title="Đặt lại kích thước chữ"
                      aria-label="Đặt lại kích thước chữ ghi chú"
                      className="flex h-10 min-w-11 items-center justify-center border-x border-slate-200 px-2 text-xs font-semibold text-blue-950 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      aA
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFontSize((current) => Math.min(24, current + 2))}
                      disabled={noteFontSize >= 24}
                      title="Tăng kích thước chữ"
                      aria-label="Tăng kích thước chữ ghi chú"
                      className="flex h-10 w-10 items-center justify-center text-blue-950 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35"
                    >
                      <Icon name="add" className="text-lg" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingNote((current) => !current)}
                    aria-pressed={isEditingNote}
                    title={isEditingNote ? 'Lưu ghi chú' : 'Chỉnh sửa ghi chú'}
                    aria-label={isEditingNote ? 'Lưu ghi chú' : 'Chỉnh sửa ghi chú'}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                      isEditingNote
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-blue-950 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <Icon name={isEditingNote ? 'check' : 'edit'} className="text-xl" />
                  </button>
                </div>
              </div>
            ) : (
              <div role="tabpanel" className="space-y-4">
                <SpeakerTile
                  videoRef={videoRef}
                  poseCanvasRef={poseCanvasRef}
                  isActive={isActive}
                  voiceLevel={voiceLevel}
                  eyeContact={eyeContact}
                  posture={posture}
                  cameraGuidance={cameraGuidance}
                  cameraError={cameraError}
                  faceMissing={faceMissing}
                  status={status}
                  isMicMuted={isMicMuted}
                  isCameraMuted={isCameraMuted}
                  showSkeleton={showSkeleton}
                  onToggleSkeleton={() => setShowSkeleton((current) => !current)}
                  className="shadow-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <LiveMetric icon="speed" label="Tốc độ nói" value={`${wordsPerMinute || 0} WPM`} tone="violet" />
                  <LiveMetric icon="warning" label="Từ đệm" value={`${fillers} lần`} tone="amber" />
                  <LiveMetric icon="visibility" label="Giao tiếp mắt" value={`${eyeContact || 0}%`} tone="sky" />
                  <LiveMetric icon="accessibility_new" label="Tư thế" value={`${posture || 0}%`} tone="emerald" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-600">Mức giọng nói</span>
                    <span className="text-xs font-bold tabular-nums text-blue-700">{voiceLevel}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600 transition-[width] duration-200" style={{ width: `${voiceLevel}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Countdown Overlay */}
      {startCountdown !== null && status === 'ready' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md">
          <div className="flex h-44 w-44 flex-col items-center justify-center rounded-3xl border border-blue-200 bg-white text-slate-900 shadow-2xl ring-4 ring-blue-100">
            <span className="animate-pulse text-6xl font-black tabular-nums text-blue-600">{startCountdown}</span>
            <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Bắt đầu sau</span>
          </div>
        </div>
      )}

      {/* Session Completed Summary Modal */}
      {status === 'ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-summary-title"
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-blue-600">BẢN TRÌNH BÀY ĐÃ KẾT THÚC</p>
                <h2 id="session-summary-title" className="mt-1 text-2xl font-black text-slate-900">
                  Tóm tắt phiên thuyết trình
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/home')}
                aria-label="Đóng"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: 'Thời gian', value: clockLabel(seconds), icon: 'timer' },
                { label: 'Tốc độ', value: `${wordsPerMinute || 0} WPM`, icon: 'speed' },
                { label: 'Từ đệm', value: `${fillers} lần`, icon: 'warning' },
                { label: 'Tự tin', value: confidence === null ? '—' : `${confidence}/100`, icon: 'verified' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px]">{metric.label}</span>
                    <Icon name={metric.icon} className="text-xs text-blue-600" />
                  </div>
                  <p className="mt-1 text-base font-black text-slate-900">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 max-h-32 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-blue-700">Bản chép lời ghi nhận: </span>
              {transcript ? `“${transcript}”` : 'Phiên này chưa nhận diện được tiếng nói rõ ràng. Bạn vẫn có thể chuyển AI chấm bài dựa trên slide.'}
            </div>

            <p className="mt-3 text-[10px] text-slate-400">
              * Điểm số sơ bộ được ước tính từ nhịp nói, âm lượng, tư thế và hướng nhìn thời gian thực.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              {recordingUrl && (
                <a
                  href={recordingUrl}
                  download="softskill-presentation.webm"
                  className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Icon name="download" className="text-base" />
                  Tải bản ghi
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Về trang chủ
              </button>
              <button
                type="button"
                onClick={openAIGReview}
                className="rounded-full bg-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
              >
                Chuyển AI chấm bài
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
