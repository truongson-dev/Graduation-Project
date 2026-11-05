import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { AppIcon as Icon } from '../components/Common/AppIcon';
import { API_ROOT } from '../lib/api';
import { extractSlideText } from '../lib/slide';
import { getPresentationHistory, type PresentationHistoryEntry } from '../lib/presentation-history';

type PracticeFile = { file: File; url: string };
type NetworkStatus = 'checking' | 'stable' | 'weak' | 'poor' | 'offline';

const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024;

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const PracticeSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  const [file, setFile] = useState<PracticeFile | null>(null);
  const [slideContent, setSlideContent] = useState('');
  const [isExtractingSlide, setIsExtractingSlide] = useState(false);
  const [cameraState, setCameraState] = useState<'off' | 'ready' | 'error'>('off');
  const [micState, setMicState] = useState<'off' | 'ready' | 'error'>('off');
  const [cameraError, setCameraError] = useState('');
  const [micError, setMicError] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => (
    typeof navigator !== 'undefined' && navigator.onLine ? 'checking' : 'offline'
  ));
  const [presentationHistory, setPresentationHistory] = useState<PresentationHistoryEntry[]>(getPresentationHistory);

  useEffect(() => {
    const syncHistory = () => setPresentationHistory(getPresentationHistory());
    window.addEventListener('storage', syncHistory);
    return () => window.removeEventListener('storage', syncHistory);
  }, []);

  useEffect(() => {
    let disposed = false;
    let activeController: AbortController | null = null;

    const updateNetworkStatus = async () => {
      if (document.hidden) return;
      if (!navigator.onLine) {
        setNetworkStatus('offline');
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      const startedAt = performance.now();

      try {
        const response = await fetch(`${API_ROOT}/health`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const latency = performance.now() - startedAt;

        if (disposed || !response.ok) {
          if (!disposed) setNetworkStatus('offline');
          return;
        }

        setNetworkStatus(latency > 1800 ? 'poor' : latency > 800 ? 'weak' : 'stable');
      } catch {
        if (!disposed && document.hidden) return;
        if (!disposed && !controller.signal.aborted) setNetworkStatus('offline');
        else if (!disposed && controller.signal.aborted) setNetworkStatus('poor');
      } finally {
        window.clearTimeout(timeoutId);
        if (activeController === controller) activeController = null;
      }
    };

    void updateNetworkStatus();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) void updateNetworkStatus();
    }, 15000);
    const handleVisibilityChange = () => {
      if (document.hidden) activeController?.abort();
      else void updateNetworkStatus();
    };
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      activeController?.abort();
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraState]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    void audioContextRef.current?.close();
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
  }, []);

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    const extension = candidate.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf') {
      setNotice('Vui lòng chọn file PDF.');
      return;
    }
    if (candidate.size > MAX_PDF_SIZE_BYTES) {
      setNotice('File PDF vượt quá giới hạn dung lượng 100 MB.');
      return;
    }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(candidate);
    fileUrlRef.current = url;
    setFile({ file: candidate, url });
    setNotice('');
    setIsExtractingSlide(true);

    void extractSlideText(candidate)
      .then((text) => {
        setSlideContent(text);
      })
      .finally(() => {
        setIsExtractingSlide(false);
      });
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  const toggleCamera = async () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraState('off');
      setCameraError('');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setCameraError('Camera không được hỗ trợ trong trình duyệt này.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState('ready');
      setCameraError('');
    } catch {
      setCameraState('error');
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.');
    }
  };

  const toggleMicrophone = async () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      setMicLevel(0);
      setMicState('off');
      setMicError('');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('error');
      setMicError('Microphone không được hỗ trợ trong trình duyệt này.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const AudioContextConstructor = window.AudioContext;
      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteTimeDomainData(samples);
        const volume = samples.reduce((total, sample) => total + Math.abs(sample - 128), 0) / samples.length;
        setMicLevel(Math.min(100, Math.round(volume * 4)));
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setMicState('ready');
      setMicError('');
    } catch {
      setMicState('error');
      setMicError('Không thể truy cập microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.');
    }
  };

  const previewFile = () => {
    if (!file) return;
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  const networkReady = networkStatus === 'stable';
  const networkIndicator = {
    checking: { label: 'Đang kiểm tra mạng', color: 'bg-slate-500 hover:bg-slate-400' },
    stable: { label: 'Mạng ổn định', color: 'bg-emerald-500 hover:bg-emerald-400' },
    weak: { label: 'Mạng yếu', color: 'bg-amber-500 hover:bg-amber-400' },
    poor: { label: 'Mạng rất yếu', color: 'bg-rose-600 hover:bg-rose-500' },
    offline: { label: 'Mất kết nối mạng', color: 'bg-rose-600 hover:bg-rose-500' },
  }[networkStatus];

  const startPractice = () => {
    if (!file || cameraState !== 'ready' || micState !== 'ready' || !networkReady) return;
    navigate('/practice/live', {
      state: {
        practice: {
          file: file.file,
          slideContent,
          duration: 5,
          criteria: ['pace', 'filler', 'eye-contact', 'logic'],
          language,
          autoStart: true,
        },
      },
    });
  };

  const canStartPractice = Boolean(file) && cameraState === 'ready' && micState === 'ready' && networkReady;
  const openHistoryEntry = (entry: PresentationHistoryEntry) => {
    navigate('/practice/review', {
      state: { presentationReview: entry.review, isHistoricalReview: true },
    });
  };

  return (
    <StudentPageLayout active="/practice/setup" title="Chuẩn bị thuyết trình">
      <div className="mx-auto max-w-[1500px] pb-10">
        {/* 2-Column Studio Setup Grid */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          {/* Left Column: Slide & Tips */}
          <div className="flex flex-col gap-6">
            {/* Slide Upload Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#19345d]">
                  <Icon name="description" className="text-blue-700" /> Tài liệu thuyết trình
                </h2>
                <span className="rounded-full bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  PDF • Tối đa 100 MB
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                aria-label="Chọn slide thuyết trình"
                onChange={handleFileInput}
              />

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
                  dragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {file ? (
                  <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200/70">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
                        <Icon
                          name="picture_as_pdf"
                          className="text-2xl text-rose-600"
                        />
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-bold text-slate-800">{file.file.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatSize(file.file.size)}
                          {isExtractingSlide && ' • Đang xử lý nội dung slide…'}
                        </p>
                      </div>
                      <div className="flex w-full gap-2 sm:w-auto">
                        <button
                          type="button"
                          onClick={previewFile}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition sm:flex-none cursor-pointer"
                        >
                          <Icon name="visibility" className="text-base" /> Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition sm:flex-none cursor-pointer"
                        >
                          <Icon name="swap_horiz" className="text-base" /> Đổi file
                        </button>
                        <button
                          type="button"
                          aria-label="Xóa slide"
                          onClick={() => {
                            URL.revokeObjectURL(file.url);
                            fileUrlRef.current = null;
                            setFile(null);
                            setSlideContent('');
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition cursor-pointer"
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 shadow-xs border border-slate-200/60">
                      <Icon name="cloud_upload" className="text-3xl" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Kéo thả PDF của bạn vào đây hoặc{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-700 hover:underline cursor-pointer"
                      >
                        Duyệt tệp từ máy
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Hỗ trợ tập tin PDF (.pdf) tối đa 100 MB
                    </p>
                  </div>
                )}
              </div>

              {notice && (
                <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {notice}
                </p>
              )}
            </section>

            {/* Practical AI Presentation Tips Card */}
            <section className="flex flex-1 flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#19345d]">
                <Icon name="tips_and_updates" className="text-amber-500 text-lg" />
                Bí quyết đạt điểm cao từ AI đánh giá 4 trụ cột
              </h3>
              <div className="mt-3 flex flex-1 flex-col justify-evenly gap-3 text-xs leading-relaxed text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                    1
                  </span>
                  <p>
                    <strong className="text-slate-800">Tránh đọc y nguyên slide:</strong> AI sẽ phát hiện nếu bạn đọc chép từng dòng văn bản. Hãy sử dụng slide làm điểm tựa và dùng ngôn từ của chính mình để diễn giải, đưa ví dụ thực tế.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                    2
                  </span>
                  <p>
                    <strong className="text-slate-800">Giữ nhịp nói vừa phải:</strong> Tốc độ lý tưởng là 115–135 từ/phút. Hạn chế các từ đệm ngập ngừng như "à", "ừm", "kiểu như".
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                    3
                  </span>
                  <p>
                    <strong className="text-slate-800">Tương tác và phong thái:</strong> Ngồi thẳng lưng, đặt camera ngang tầm mắt và giữ ánh nhìn tự nhiên hướng vào camera để đạt điểm giao tiếp mắt cao.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Camera, Audio & Launch */}
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              {/* Video Screen Container - Clean, No Dashed Lines, No Face Tracking Box */}
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-inner">
                {cameraState === 'ready' && (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-cover"
                  />
                )}

                <span
                  role="status"
                  aria-live="polite"
                  aria-label={networkIndicator.label}
                  title={networkIndicator.label}
                  className={`absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-colors ${networkIndicator.color}`}
                >
                  <Icon name="wifi" className="text-xl" />
                </span>

                {/* Floating Media Toggle Controls (Bottom Right) */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-slate-900/85 p-1.5 text-white shadow-lg backdrop-blur-md border border-white/10">
                  <button
                    type="button"
                    onClick={() => void toggleCamera()}
                    aria-label={cameraState === 'ready' ? 'Tắt camera' : 'Bật camera'}
                    title={cameraState === 'ready' ? 'Tắt camera' : 'Bật camera'}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition cursor-pointer ${
                      cameraState === 'ready'
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <Icon name={cameraState === 'ready' ? 'videocam' : 'videocam_off'} className="text-xl" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleMicrophone()}
                    aria-label={micState === 'ready' ? 'Tắt micro' : 'Bật micro'}
                    title={micState === 'ready' ? 'Tắt micro' : 'Bật micro'}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition cursor-pointer ${
                      micState === 'ready'
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <Icon name={micState === 'ready' ? 'mic' : 'mic_off'} className="text-xl" />
                  </button>
                </div>
              </div>

              {cameraError && (
                <p role={cameraState === 'error' ? 'alert' : 'status'} className="mt-2 text-xs text-rose-600">
                  {cameraError}
                </p>
              )}

              {/* Microphone Testing Box - ONLY renders when mic is toggled ON */}
              {micState === 'ready' && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon name="mic" className="text-[15px] text-blue-700" />
                      Trạng thái thu âm: <strong className="text-slate-900">{micLevel > 4 ? 'Đang nhận giọng nói' : 'Đang chờ âm thanh…'}</strong>
                    </span>
                    <span className="font-bold text-slate-800">Mức âm lượng: {Math.min(100, micLevel)}%</span>
                  </div>

                  <div
                    aria-label={`Mức âm thanh ${micLevel}%`}
                    className="mt-2 flex h-7 items-center gap-1 overflow-hidden rounded-lg border border-slate-200 bg-white px-2 shadow-2xs"
                  >
                    {Array.from({ length: 36 }, (_, index) => (
                      <span
                        key={index}
                        className="h-2 flex-1 rounded-full transition-all duration-75"
                        style={{
                          height: `${12 + Math.max(0, micLevel - index * 2) * 0.55 + ((index * 17) % 20)}px`,
                          backgroundColor: index < Math.ceil(micLevel / 3) ? '#1e293b' : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {micError && <p role="alert" className="mt-2 text-xs text-rose-600">{micError}</p>}

              {/* Language Selection Box */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                    <Icon name="translate" className="text-[15px] text-blue-700" /> Ngôn ngữ thuyết trình
                  </span>
                  <div
                    role="group"
                    aria-label="Chọn ngôn ngữ thuyết trình"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setLanguage('vi')}
                      aria-pressed={language === 'vi'}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        language === 'vi'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span aria-hidden="true">🇻🇳</span>
                      <span>Tiếng Việt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      aria-pressed={language === 'en'}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        language === 'en'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span aria-hidden="true">🇬🇧</span>
                      <span>Tiếng Anh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Readiness Checklist & Start Button */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Điều kiện bắt đầu:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`flex items-center gap-1 ${file ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                      <Icon name={file ? 'check_circle' : 'radio_button_unchecked'} className="text-sm" /> Slide đã tải
                    </span>
                    <span className={`flex items-center gap-1 ${cameraState === 'ready' ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                      <Icon name={cameraState === 'ready' ? 'check_circle' : 'radio_button_unchecked'} className="text-sm" /> Camera
                    </span>
                    <span className={`flex items-center gap-1 ${micState === 'ready' ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                      <Icon name={micState === 'ready' ? 'check_circle' : 'radio_button_unchecked'} className="text-sm" /> Micro
                    </span>
                    <span className="flex items-center gap-1 text-blue-700 font-semibold">
                      <Icon name="check_circle" className="text-sm" /> {language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={startPractice}
                    disabled={!canStartPractice}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white disabled:shadow-none cursor-pointer"
                  >
                    <Icon name="play_arrow" className="text-lg" /> Vào buổi thuyết trình
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="mt-8" aria-labelledby="presentation-history-title">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 id="presentation-history-title" className="text-lg font-extrabold text-[#19345d]">Các phiên thuyết trình trước</h2>
              <p className="mt-1 text-xs text-slate-600">Mở báo cáo để xem lại chỉ số và bài luyện được gợi ý.</p>
            </div>
            {presentationHistory.length > 0 && <span className="text-xs font-semibold tabular-nums text-slate-500">{presentationHistory.length} phiên gần nhất</span>}
          </div>

          {presentationHistory.length === 0 ? (
            <div className="flex items-start gap-3 py-6 text-slate-600">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon name="history" className="text-xl" /></span>
              <div><p className="text-sm font-semibold text-slate-800">Chưa có phiên luyện nào</p><p className="mt-1 text-xs">Sau khi hoàn thành buổi thuyết trình, báo cáo sẽ xuất hiện tại đây.</p></div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" aria-label="Lịch sử thuyết trình">
              {presentationHistory.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => openHistoryEntry(entry)}
                    className="group flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4 text-left transition hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-800"><Icon name="picture_as_pdf" className="text-lg" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">{entry.review.fileName || 'Bài thuyết trình'}</span>
                        <span className="mt-1 block text-xs text-slate-600">
                          {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                          <span aria-hidden="true"> · </span> {entry.review.duration}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-[52px] text-xs text-slate-700 sm:pl-0">
                      <span><strong className="tabular-nums">{entry.review.wordsPerMinute}</strong> từ/phút</span>
                      <span><strong className="tabular-nums">{entry.review.fillers}</strong> từ đệm</span>
                      <span><strong className="tabular-nums">{entry.review.eyeContact}%</strong> giao tiếp mắt</span>
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700">Xem báo cáo <Icon name="arrow_forward" /></span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Lịch sử được lưu trong trình duyệt trên thiết bị này.</p>
        </section>
      </div>
    </StudentPageLayout>
  );
};
