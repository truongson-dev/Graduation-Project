import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Presentation } from '@web-ppt/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { BrandMark } from '../components/BrandMark';

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';
type LivePageState = {
  practice?: {
    file?: File;
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
  processLocally?: boolean;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => LocalVoiceRecognition;
  webkitSpeechRecognition?: new () => LocalVoiceRecognition;
};

const FILLER_WORDS = ['ừm', 'ừ', 'ờ', 'à', 'kiểu như', 'nói chung là', 'thì là', 'uh', 'um'];

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function countFillers(transcript: string) {
  const normalized = transcript.toLocaleLowerCase('vi-VN');
  return FILLER_WORDS.reduce((total, filler) => {
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
  const speechServiceAllowedRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>('ready');
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'pip' | 'slide'>('split');

  const fillers = countFillers(transcript);
  const confidence = eyeContact > 0 && posture > 0 ? estimateConfidence(eyeContact, posture, voiceLevel, wordsPerMinute, fillers) : null;
  const fileName = file?.name ?? 'Bài thuyết trình';
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

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
    recognitionRef.current?.stop();
    if (recordingRef.current?.state === 'recording' || recordingRef.current?.state === 'paused') recordingRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    faceLandmarkerRef.current?.close();
    poseLandmarkerRef.current?.close();
    void audioContextRef.current?.close();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setSlideNumber((current) => slideCount ? Math.min(slideCount, current + 1) : current + 1);
      if (event.key === 'ArrowLeft') setSlideNumber((current) => Math.max(1, current - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slideCount]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startLocalRecognition = (allowBrowserService = speechServiceAllowedRef.current) => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    const supportsLocalMode = 'processLocally' in recognition;
    if (!supportsLocalMode && !allowBrowserService) return;
    if (supportsLocalMode) recognition.processLocally = !allowBrowserService;
    if (allowBrowserService) speechServiceAllowedRef.current = true;
    recognition.lang = practice?.language === 'en' ? 'en-US' : 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionBaseRef.current = recognitionFinalRef.current || transcriptRef.current;
    let restartOnEnd = true;
    recognition.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result?.[0]?.transcript?.trim();
        if (!phrase) continue;
        (result.isFinal ? finalParts : interimParts).push(phrase);
      }
      recognitionFinalRef.current = [recognitionBaseRef.current, finalParts.join(' ')].filter(Boolean).join(' ').trim();
      const liveTranscript = [recognitionFinalRef.current, interimParts.join(' ')].filter(Boolean).join(' ').trim();
      transcriptRef.current = liveTranscript;
      setTranscript(liveTranscript);
    };
    recognition.onerror = (event) => {
      if (event.error === 'language-not-supported' || event.error === 'language-unavailable') {
        restartOnEnd = false;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') restartOnEnd = false;
    };
    recognition.onend = () => {
      recognitionBaseRef.current = recognitionFinalRef.current || recognitionBaseRef.current;
      transcriptRef.current = recognitionFinalRef.current || transcriptRef.current;
      setTranscript(transcriptRef.current);
      if (runRef.current && restartOnEnd) {
        try { recognition.start(); } catch { /* Recognition may still be shutting down. */ }
      }
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch { /* Speech recognition is optional and must not interrupt a session. */ }
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: { echoCancellation: true, noiseSuppression: true } });
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
      const recorder = new MediaRecorder(audioOnlyStream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
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
                setCameraGuidance(faceCenterX < 0.28 || faceCenterX > 0.72 || faceCenterY < 0.12 || faceCenterY > 0.78
                  ? 'Đưa khuôn mặt vào giữa khung'
                  : faceWidth > 0.4 ? 'Hơi gần — lùi ra một chút'
                    : faceWidth < 0.14 ? 'Hơi xa — tiến lại gần'
                      : 'Vị trí và khoảng cách tương đối phù hợp');
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
                  const links = [[0, 11], [0, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];
                  context.strokeStyle = 'rgba(94, 234, 212, .92)';
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
                  context.fillStyle = '#5eead4';
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
                  setGestureFeedback(handsInGestureZone ? 'Tay trong vùng trình bày' : 'Nâng tay nhẹ để nhấn ý');
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
              setCameraError('Đang gặp khó khăn khi phân tích hình ảnh. Video vẫn được ghi trong phiên này.');
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
      recognitionRef.current?.stop();
      if (recordingRef.current?.state === 'recording') recordingRef.current.pause();
      setStatus('paused');
      return;
    }
    if (status === 'paused') {
      runRef.current = true;
      startedAtRef.current = performance.now();
      if (recordingRef.current?.state === 'paused') recordingRef.current.resume();
      setStatus('live');
      startLocalRecognition();
      if (trackingFrameRef.current) frameRef.current = requestAnimationFrame(trackingFrameRef.current);
    }
  };

  const finishSession = () => {
    runRef.current = false;
    recognitionRef.current?.stop();
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
        transcript,
        duration: clockLabel(seconds),
        wordsPerMinute,
        fillers,
        eyeContact,
        posture,
        confidence,
        fileName,
      },
    },
  });

  const isActive = status === 'live' || status === 'paused';

  return (
    <div className="min-h-screen bg-[#f4f5fb] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
          <div className="flex items-center gap-2.5"><Link to="/home" aria-label="Về trang chủ" className="flex h-10 w-10 items-center justify-center"><BrandMark className="h-10 w-10" /></Link><div><p className="text-base font-extrabold tracking-tight text-[#19345d] sm:text-lg">SoftSkill AI</p><div className="flex items-center gap-2 text-[10px] font-semibold text-teal-800"><span className="h-2 w-2 rounded-full bg-teal-500" />AI Live Mode</div></div></div>
          <div className="flex items-center gap-2 sm:gap-3">{status !== 'ready' && <span className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold sm:flex ${status === 'live' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-2 w-2 rounded-full ${status === 'live' ? 'animate-pulse bg-rose-500' : 'bg-slate-400'}`} />{status === 'live' ? `REC • ${clockLabel(seconds)}` : status === 'paused' ? `Tạm dừng • ${clockLabel(seconds)}` : 'Đã kết thúc'}</span>}{(status === 'live' || status === 'paused') && <button type="button" onClick={finishSession} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800"><Icon name="send" />Kết thúc trình bày</button>}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-3 pb-8 pt-4 sm:px-5 lg:px-7">
        <div className={`grid items-start gap-4 lg:gap-5 ${viewMode === 'slide' || viewMode === 'pip' ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,.8fr)]'}`}>
          <div id="slides" className={viewMode === 'split' ? 'contents' : 'flex min-w-0 flex-col gap-4'}>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600"><Icon name="slideshow" className="text-teal-700" />Khu vực trình chiếu chính</h2><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800">{isPdf ? 'PDF • Bản gốc' : 'POWERPOINT • Bản gốc'}</span></div>
              <div ref={isPdf ? pdfFrameRef : undefined} className={`relative flex ${viewMode === 'split' ? 'lg:aspect-[3.2/1]' : 'aspect-video'} items-center justify-center overflow-hidden rounded-xl bg-[#092746]`}>
                {isPdf && pdfDocument ? <canvas ref={pdfCanvasRef} aria-label={`Trang ${slideNumber} của ${fileName}`} className="max-h-full max-w-full bg-white" /> : !isPdf && powerPointSvg ? <iframe title={`Slide ${slideNumber} của ${fileName}`} sandbox="" srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline' data: blob:; font-src data: blob:;">${powerPointSvg}`} className="h-full w-full border-0 bg-white" /> : <div className="flex flex-col items-center gap-2 px-6 text-center text-white"><Icon name={slideLoadError ? 'error' : 'progress_activity'} className="text-3xl" /><p className="text-sm font-semibold">{slideLoadError || `Đang tải slide ${isPdf ? 'PDF' : 'PowerPoint'}…`}</p></div>}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><button type="button" disabled={slideNumber <= 1} onClick={() => setSlideNumber((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg bg-[#f2f1fb] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"><Icon name="chevron_left" />Slide trước</button><span className="rounded bg-[#f3f2fa] px-2 py-1.5 font-mono text-[10px] text-slate-500">← / →</span><button type="button" onClick={() => setSlideNumber((current) => slideCount ? Math.min(slideCount, current + 1) : current + 1)} className="inline-flex items-center gap-1 rounded-lg bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900">Slide kế<Icon name="chevron_right" /></button></div><div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1"><button type="button" onClick={() => setViewMode('split')} aria-pressed={viewMode === 'split'} className={`rounded-md px-2 py-1.5 text-[10px] font-bold ${viewMode === 'split' ? 'bg-[#19345d] text-white' : 'text-slate-500'}`}>Split 50:50</button><button type="button" onClick={() => setViewMode('pip')} aria-pressed={viewMode === 'pip'} className={`rounded-md px-2 py-1.5 text-[10px] font-bold ${viewMode === 'pip' ? 'bg-[#19345d] text-white' : 'text-slate-500'}`}>PiP</button><button type="button" onClick={() => setViewMode('slide')} aria-pressed={viewMode === 'slide'} className={`rounded-md px-2 py-1.5 text-[10px] font-bold ${viewMode === 'slide' ? 'bg-[#19345d] text-white' : 'text-slate-500'}`}>Slide focus</button></div></div>
            </section>
            {viewMode !== 'split' && <section className="rounded-2xl border border-teal-200 bg-[#e7faf7] p-4 shadow-sm sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-teal-900"><Icon name="lightbulb" />Gợi ý cho phần trình bày</h2><p className="mt-2 text-sm leading-relaxed text-teal-900">{fillers > 2 ? 'Bạn đang dùng một vài từ đệm. Thử dừng một nhịp và bắt đầu câu tiếp theo bằng ý chính.' : posture > 0 && posture < 70 ? 'Giữ vai cân bằng và hướng mặt về camera để tạo cảm giác tự tin hơn.' : eyeContact > 60 ? 'Bạn đang nhìn về phía camera tốt. Tiếp tục giữ nhịp nói vừa phải và nhấn vào luận điểm chính.' : 'Hãy nhìn vào camera, nói rõ từng ý và dành một nhịp nghỉ giữa các phần.'}</p></section>}
          </div>

          {viewMode !== 'slide' && <aside id="live-metrics" className={viewMode === 'split' ? 'contents' : `flex min-w-0 flex-col gap-4 ${viewMode === 'pip' ? 'lg:grid lg:grid-cols-2' : ''}`}>
            {viewMode === 'split' && <section className="rounded-2xl border border-teal-200 bg-[#e7faf7] p-4 shadow-sm sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-teal-900"><Icon name="lightbulb" />Gợi ý cho phần trình bày</h2><p className="mt-2 text-sm leading-relaxed text-teal-900">{fillers > 2 ? 'Bạn đang dùng một vài từ đệm. Thử dừng một nhịp và bắt đầu câu tiếp theo bằng ý chính.' : posture > 0 && posture < 70 ? 'Giữ vai cân bằng và hướng mặt về camera để tạo cảm giác tự tin hơn.' : eyeContact > 60 ? 'Bạn đang nhìn về phía camera tốt. Tiếp tục giữ nhịp nói vừa phải và nhấn vào luận điểm chính.' : 'Hãy nhìn vào camera, nói rõ từng ý và dành một nhịp nghỉ giữa các phần.'}</p></section>}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-[#19345d]"><Icon name="videocam" className="text-teal-700" />Webcam &amp; theo dõi tư thế</h2></div><div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#10284e] via-[#164a68] to-[#10a99b]">{isActive ? <><video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" /><canvas ref={poseCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]" /></> : <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10"><Icon name="videocam" className="text-3xl" /></span><p className="mt-3 text-sm font-bold">{status === 'ended' ? 'Phiên thuyết trình đã hoàn tất' : 'Bật camera để bắt đầu'}</p><p className="mt-1 text-xs text-blue-100">Camera và micro chỉ hoạt động sau khi bạn nhấn bắt đầu</p></div>}<div className="pointer-events-none absolute inset-x-[18%] inset-y-[8%] rounded-2xl border border-dashed border-teal-200/80" />{isActive && <><div className="absolute left-3 top-3 rounded-lg bg-[#002045]/75 px-2 py-1 text-[10px] font-bold text-white"><Icon name="visibility" className="mr-1" />Eye contact: {eyeContact}%</div><div className="absolute left-3 top-12 rounded-lg bg-[#002045]/75 px-2 py-1 text-[10px] font-semibold text-teal-100">{posture >= 70 ? 'Tư thế: Cân bằng' : 'Tư thế: Điều chỉnh nhẹ'}</div><div className="absolute bottom-3 right-3 rounded-lg bg-[#002045]/80 px-2 py-1 text-[10px] font-semibold text-white"><Icon name="distance" className="mr-1" />{cameraGuidance}</div></>}<div className="absolute right-3 top-3 z-10 flex items-center gap-1.5"><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${isActive ? 'bg-teal-50/95 text-teal-800' : 'bg-white/90 text-slate-500'}`}><Icon name="mic" className="mr-1" />Mic {isActive ? 'ON' : 'OFF'}</span><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${isActive ? 'bg-teal-50/95 text-teal-800' : 'bg-white/90 text-slate-500'}`}><Icon name="videocam" className="mr-1" />Cam {isActive ? 'ON' : 'OFF'}</span><button type="button" onClick={pauseSession} disabled={status !== 'live' && status !== 'paused'} aria-label={status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'} className="flex h-7 items-center gap-1 rounded-lg bg-white/95 px-2 text-[10px] font-bold text-slate-700 shadow-sm disabled:opacity-50"><Icon name={status === 'paused' ? 'play_arrow' : 'pause'} />{status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}</button></div></div>{cameraError && <p role="alert" className="mt-2 text-xs text-amber-700">{cameraError}</p>}{faceMissing && isActive && <p role="alert" aria-live="assertive" className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Icon name="warning" />Cảnh báo: Không thấy người trong khung hình. Hãy quay lại vị trí trước camera.</p>}</section>

            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-[#19345d]"><Icon name="psychology" className="text-teal-700" />Chỉ số AI huấn luyện viên</h2></div><div className="grid grid-cols-2 gap-2"><article className="rounded-xl bg-[#f4f2ff] p-3"><div className="flex items-center justify-between text-[11px] text-slate-500"><span>Tốc độ nói live</span><Icon name="speed" className="text-teal-800" /></div><p className="mt-2 text-2xl font-extrabold text-teal-800">{wordsPerMinute || '—'} <span className="text-xs font-semibold">từ/phút</span></p><p className="text-[10px] text-slate-500">{wordsPerMinute === 0 ? (voiceLevel > 8 ? 'Đang nhận giọng nói; chờ nhận dạng để tính từ/phút' : 'Đang chờ lời nói') : wordsPerMinute < 100 ? 'Chậm, rõ ràng' : wordsPerMinute > 165 ? 'Hơi nhanh' : 'Nhịp nói ổn định'}</p></article><article className={`rounded-xl p-3 ${fillers > 2 ? 'bg-amber-50' : 'bg-[#f1fbf8]'}`}><div className="flex items-center justify-between text-[11px] text-slate-500"><span>Từ đệm</span><Icon name="warning" className="text-amber-600" /></div><p className="mt-2 text-2xl font-extrabold text-amber-700">{fillers} <span className="text-xs font-semibold">lần</span></p><p className="text-[10px] text-amber-700">{FILLER_WORDS.slice(0, 4).map((word) => `“${word}”`).join(', ')}</p></article></div><div className="mt-2 rounded-xl bg-[#f4f2ff] p-3"><div className="flex items-center justify-between text-[11px] text-slate-500"><span className="flex items-center gap-1"><Icon name="graphic_eq" className="text-teal-800" />Âm lượng &amp; độ ổn định giọng</span><span className="font-mono font-bold">{voiceLevel ? `${Math.round(20 * Math.log10(Math.max(0.01, voiceLevel / 100)))} dB` : '— dB'}</span></div><div className="mt-2 flex h-8 items-center gap-1 rounded-lg bg-white px-2">{Array.from({ length: 32 }, (_, index) => <span key={index} className="flex-1 rounded-full bg-teal-700 transition-all" style={{ height: `${voiceLevel ? 5 + ((voiceLevel + index * 13) % 22) : 5 + ((index * 7) % 8)}px`, opacity: voiceLevel ? 0.35 + ((index + voiceLevel) % 6) / 10 : 0.35 }} />)}</div></div><div className="mt-2 grid grid-cols-2 gap-2"><article className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Ước lượng thể hiện tự tin</p><p className="mt-1 text-xl font-extrabold text-[#19345d]">{isActive ? (confidence ?? 'Đang phân tích') : '—'}<span className="ml-0.5 text-xs">{confidence === null ? '' : '/100'}</span></p></article><article className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Ngôn ngữ cơ thể</p><p className="mt-1 text-sm font-bold text-teal-800">{isActive ? posture >= 70 ? 'Tốt' : 'Cần chỉnh' : '—'}</p><p className="text-[10px] text-slate-400">{gestureFeedback} · {gestureCount} cử chỉ</p></article></div></section>

          </aside>}
        </div>
      </main>

      {startCountdown !== null && status === 'ready' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0b1f3a]/55 p-4 backdrop-blur-sm"><div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-white/80 bg-blue-700 text-white shadow-2xl"><span className="text-6xl font-extrabold tabular-nums">{startCountdown}</span><span className="mt-1 text-xs font-semibold">Bắt đầu sau</span></div></div>}
      {status === 'ended' && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05152c]/45 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="session-summary-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-teal-700">HOÀN TẤT PHẦN TRÌNH BÀY</p><h2 id="session-summary-title" className="mt-1 text-xl font-extrabold text-[#19345d]">Tóm tắt phiên luyện tập</h2></div><button type="button" onClick={() => navigate('/home')} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Icon name="close" /></button></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: 'Thời gian', value: clockLabel(seconds) }, { label: 'Tốc độ nói', value: `${wordsPerMinute || 0} WPM` }, { label: 'Từ đệm', value: `${fillers} lần` }, { label: 'Tự tin*', value: confidence === null ? 'Chưa đủ dữ liệu' : `${confidence}/100` }].map((metric) => <div key={metric.label} className="rounded-xl bg-[#f6f7fc] p-3"><p className="text-[10px] text-slate-500">{metric.label}</p><p className="mt-1 text-sm font-extrabold text-[#19345d]">{metric.value}</p></div>)}</div><p className="mt-4 text-xs leading-relaxed text-slate-600">{transcript ? `Bản chép lời: “${transcript}”` : 'Phiên này chưa có bản chép lời. Hãy bật nhận dạng tiếng nói nếu trình duyệt yêu cầu, hoặc nhập nội dung thủ công sau khi chuyển sang AI chấm bài.'}</p><p className="mt-2 text-[10px] text-slate-400">*Chỉ số tham khảo được suy ra từ nhịp nói, âm lượng, tư thế và hướng nhìn.</p><div className="mt-5 flex flex-wrap justify-end gap-2">{recordingUrl && <a href={recordingUrl} download="skillbridge-recording.webm" className="mr-auto inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-800"><Icon name="download" />Tải bản ghi</a>}<button type="button" onClick={() => navigate('/home')} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600">Về trang chủ</button><button type="button" onClick={openAIGReview} className="rounded-xl bg-[#002045] px-4 py-2.5 text-sm font-bold text-white">Chuyển AI chấm bài</button></div></section></div>}
    </div>
  );
};
