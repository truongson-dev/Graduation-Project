import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Presentation } from '@web-ppt/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractSlideText } from '../lib/slide';
import { MeetingTopBar } from '../components/Presentation/MeetingTopBar';
import { MeetingBottomDock } from '../components/Presentation/MeetingBottomDock';
import { SpeakerTile } from '../components/Presentation/SpeakerTile';
import { AiCoachDrawer } from '../components/Presentation/AiCoachDrawer';

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

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

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
  const [speechError, setSpeechError] = useState('');
  const [startCountdown, setStartCountdown] = useState<number | null>(() => practice?.autoStart ? 5 : null);
  const [cameraError, setCameraError] = useState('');
  const [slideNumber, setSlideNumber] = useState(1);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [powerPointSvg, setPowerPointSvg] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [slideLoadError, setSlideLoadError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(0);
  const [eyeContact, setEyeContact] = useState(0);
  const [posture, setPosture] = useState(0);
  const [cameraGuidance, setCameraGuidance] = useState('Đang tìm khuôn mặt…');
  const [gestureCount, setGestureCount] = useState(0);
  const [gestureFeedback, setGestureFeedback] = useState('Đang phân tích cử chỉ…');
  const [faceMissing, setFaceMissing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // Google Meet UI states
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraMuted, setIsCameraMuted] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const fillers = countFillers(transcript, practice?.language);
  const confidence = eyeContact > 0 && posture > 0 ? estimateConfidence(eyeContact, posture, voiceLevel, wordsPerMinute, fillers) : null;
  const fileName = file?.name ?? 'hung_dung_do_an_tot_nghiep.pdf';
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

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
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey) {
        setShowCaptions((prev) => !prev);
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
      const stream = await navigator.mediaDevices.getUserMedia({
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#202124] text-[#e8eaed] select-none font-sans">
      {/* Top Header: Authentic Google Meet Presentation Bar */}
      <MeetingTopBar
        fileName={fileName}
        isPdf={isPdf}
        status={status}
        seconds={seconds}
        onFinishSession={finishSession}
      />

      {/* Main Workspace Stage */}
      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Presentation Stage Canvas */}
        <main className="relative flex flex-1 items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div
            ref={isPdf ? pdfFrameRef : undefined}
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[#202124]"
          >
            {isPdf && pdfDocument ? (
              <canvas
                ref={pdfCanvasRef}
                aria-label={`Trang ${slideNumber} của ${fileName}`}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl bg-white"
              />
            ) : !isPdf && powerPointSvg ? (
              <iframe
                title={`Slide ${slideNumber} của ${fileName}`}
                sandbox=""
                srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline' data: blob:; font-src data: blob:;"><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#202124;height:100vh;">${powerPointSvg}</body>`}
                className="h-full w-full border-0 rounded-xl bg-white"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-neutral-400">
                <Icon name={slideLoadError ? 'error' : 'progress_activity'} className={`text-4xl ${!slideLoadError ? 'animate-spin text-[#8ab4f8]' : 'text-[#ea4335]'}`} />
                <p className="text-sm font-semibold text-neutral-300">
                  {slideLoadError || `Đang tải trang trình chiếu ${isPdf ? 'PDF' : 'PowerPoint'}…`}
                </p>
              </div>
            )}

            {/* Google Meet Slide Switcher Pill: [ ◀ 2 / 69 ▶ ] */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-neutral-700/80 bg-[#202124]/90 px-3 py-1 shadow-2xl backdrop-blur-md">
                <button
                  type="button"
                  disabled={slideNumber <= 1}
                  onClick={() => setSlideNumber((current) => Math.max(1, current - 1))}
                  title="Trang trước (←)"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 hover:bg-[#3c4043] hover:text-white disabled:opacity-30"
                >
                  <Icon name="chevron_left" className="text-base" />
                </button>
                <span className="font-semibold text-xs text-white tracking-wider px-1.5">
                  {slideNumber} / {slideCount || 1}
                </span>
                <button
                  type="button"
                  disabled={Boolean(slideCount && slideNumber >= slideCount)}
                  onClick={() => setSlideNumber((current) => (slideCount ? Math.min(slideCount, current + 1) : current + 1))}
                  title="Trang sau (→)"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 hover:bg-[#3c4043] hover:text-white disabled:opacity-30"
                >
                  <Icon name="chevron_right" className="text-base" />
                </button>
              </div>
            </div>

            {/* Google Meet Live Captions Overlay Banner (when enabled) */}
            {showCaptions && transcript && (
              <div className="pointer-events-none absolute bottom-16 inset-x-4 sm:inset-x-12 z-20 flex justify-center">
                <div className="rounded-xl bg-black/85 px-4 py-2 text-center text-sm font-medium text-white shadow-xl backdrop-blur-md max-w-2xl">
                  <span className="font-bold text-[#8ab4f8]">Bạn: </span>
                  <span>{transcript.split(' ').slice(-14).join(' ')}</span>
                </div>
              </div>
            )}
            {showCaptions && !transcript && speechError && status === 'live' && (
              <div className="pointer-events-none absolute bottom-16 inset-x-4 sm:inset-x-12 z-20 flex justify-center">
                <div className="rounded-xl bg-amber-950/80 border border-amber-500/40 px-4 py-2 text-center text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md max-w-2xl flex items-center gap-2">
                  <Icon name="info" className="text-sm" />
                  <span>{speechError}</span>
                </div>
              </div>
            )}

            {/* Floating Speaker Webcam Tile at Bottom-Right (Google Meet Style) */}
            <div className="absolute right-4 bottom-4 z-20 w-64 sm:w-80 shadow-2xl">
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
                onToggleSkeleton={() => setShowSkeleton((prev) => !prev)}
              />
            </div>
          </div>
        </main>

        {/* Collapsible Right Sidebar: In-Call AI Coach & Transcripts */}
        <AiCoachDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          wordsPerMinute={wordsPerMinute}
          fillers={fillers}
          confidence={confidence}
          voiceLevel={voiceLevel}
          posture={posture}
          eyeContact={eyeContact}
          gestureFeedback={gestureFeedback}
          gestureCount={gestureCount}
          transcript={transcript}
          isActive={isActive}
          speechError={speechError}
        />
      </div>

      {/* Authentic Google Meet Bottom Toolbar */}
      <MeetingBottomDock
        status={status}
        isMicMuted={isMicMuted}
        isCameraMuted={isCameraMuted}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onTogglePause={pauseSession}
        onFinishSession={finishSession}
        slideNumber={slideNumber}
        slideCount={slideCount}
        onPrevSlide={() => setSlideNumber((current) => Math.max(1, current - 1))}
        onNextSlide={() => setSlideNumber((current) => (slideCount ? Math.min(slideCount, current + 1) : current + 1))}
        isAiDrawerOpen={isAiDrawerOpen}
        onToggleAiDrawer={() => setIsAiDrawerOpen((prev) => !prev)}
        showCaptions={showCaptions}
        onToggleCaptions={() => setShowCaptions((prev) => !prev)}
        voiceLevel={voiceLevel}
      />

      {/* Countdown Overlay (Sleek Dark Frosted Glass) */}
      {startCountdown !== null && status === 'ready' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-44 w-44 flex-col items-center justify-center rounded-3xl border border-neutral-700 bg-[#202124] text-white shadow-2xl ring-4 ring-[#8ab4f8]/20">
            <span className="text-6xl font-black tabular-nums text-[#8ab4f8] animate-pulse">{startCountdown}</span>
            <span className="mt-2 text-xs font-semibold text-neutral-300 uppercase tracking-widest">Bắt đầu sau</span>
          </div>
        </div>
      )}

      {/* Session Completed Summary Modal (Google Meet Ending Dialog Style) */}
      {status === 'ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-summary-title"
            className="w-full max-w-lg rounded-3xl border border-neutral-700/80 bg-[#202124] p-6 shadow-2xl text-white"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8ab4f8]">BẢN TRÌNH BÀY ĐÃ KẾT THÚC</p>
                <h2 id="session-summary-title" className="mt-1 text-2xl font-black text-white">
                  Tóm tắt phiên thuyết trình
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/home')}
                aria-label="Đóng"
                className="rounded-full p-2 text-neutral-400 hover:bg-[#3c4043] hover:text-white transition-colors"
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
                <div key={metric.label} className="rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[10px]">{metric.label}</span>
                    <Icon name={metric.icon} className="text-xs text-[#8ab4f8]" />
                  </div>
                  <p className="mt-1 text-base font-black text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3 text-xs leading-relaxed text-neutral-300 max-h-32 overflow-y-auto">
              <span className="font-semibold text-[#8ab4f8]">Bản chép lời ghi nhận: </span>
              {transcript ? `“${transcript}”` : 'Phiên này chưa nhận diện được tiếng nói rõ ràng. Bạn vẫn có thể chuyển AI chấm bài dựa trên slide.'}
            </div>

            <p className="mt-3 text-[10px] text-neutral-500">
              * Điểm số sơ bộ được ước tính từ nhịp nói, âm lượng, tư thế và hướng nhìn thời gian thực.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              {recordingUrl && (
                <a
                  href={recordingUrl}
                  download="softskill-presentation.webm"
                  className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-neutral-600 bg-[#3c4043] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4a4e52] transition-colors"
                >
                  <Icon name="download" className="text-base" />
                  Tải bản ghi
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="rounded-full border border-neutral-700 bg-transparent px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-[#3c4043] hover:text-white transition-colors"
              >
                Về trang chủ
              </button>
              <button
                type="button"
                onClick={openAIGReview}
                className="rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#202124] px-5 py-2 text-xs font-extrabold shadow-lg active:scale-95 transition-all"
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
