import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { extractSlideText } from '../api/slide';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_ROOT } from '@/core/api/client';
import { getPresentationHistory, deletePresentationHistoryEntry, type PresentationHistoryEntry } from '../api/presentation-history';
import { usePresentationSessions, useDeletePresentation, type PresentationSessionDto } from '../api/presentation-session';
import { cn } from '@/core/utils/cn';
import { FileText, History, ArrowRight, Trash2, Loader2, Clock, Calendar, Search } from 'lucide-react';

type IconName = string;
type PracticeFile = { file: File; url: string };
type NetworkStatus = 'checking' | 'stable' | 'weak' | 'poor' | 'offline';

const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024;

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

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
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const serverSessionsQuery = usePresentationSessions();
  const deleteSessionMutation = useDeletePresentation();

  const syncHistory = () => setPresentationHistory(getPresentationHistory());

  useEffect(() => {
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
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeController?.abort();
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
    if (!['pdf', 'ppt', 'pptx'].includes(extension ?? '')) {
      setNotice('Vui lòng chọn file định dạng PDF, PPT hoặc PPTX.');
      return;
    }
    if (candidate.size > MAX_PDF_SIZE_BYTES) {
      setNotice('File vượt quá giới hạn dung lượng 100 MB.');
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
    if (file.file.type === 'application/pdf' || file.file.name.toLowerCase().endsWith('.pdf')) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    } else {
      setNotice('Đã chọn slide PowerPoint. Bạn có thể xem slide đầy đủ khi bước vào phiên thuyết trình trực tiếp.');
    }
  };

  const startPractice = () => {
    if (!file || cameraState !== 'ready' || micState !== 'ready' || networkStatus === 'offline') return;
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

  const openHistoryEntry = (entry: PresentationHistoryEntry) => {
    navigate('/practice/review', {
      state: {
        presentationReview: entry.review,
        isHistoricalReview: true,
      },
    });
  };

  const canStartPractice = Boolean(file) && cameraState === 'ready' && micState === 'ready' && networkStatus !== 'offline';

  return (
    <StudentPageLayout active="/practice/setup" title="Chuẩn bị thuyết trình">
      <div className="mx-auto max-w-[1500px] pb-10">
        {/* Page Subtitle / Introduction */}
        <div className="mb-6 rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-[#19345d] sm:text-2xl flex items-center gap-2.5">
                <Icon name="co_present" className="text-blue-700 text-28px" /> Thiết lập phòng luyện tập thuyết trình
              </h1>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                Tải lên slide nội dung và kiểm tra thiết bị ghi hình, âm thanh để trợ lý AI sẵn sàng theo dõi và đánh giá bạn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  networkStatus === 'stable' ? 'outline' :
                  networkStatus === 'poor' || networkStatus === 'weak' ? 'secondary' :
                  networkStatus === 'offline' ? 'destructive' : 'outline'
                }
                className={`gap-1.5 px-3 py-1 text-xs font-semibold ${
                  networkStatus === 'stable' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  networkStatus === 'poor' || networkStatus === 'weak' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''
                }`}
              >
                <span className={`size-2 rounded-full ${
                  networkStatus === 'stable' ? 'bg-emerald-500' :
                  networkStatus === 'weak' || networkStatus === 'poor' ? 'bg-amber-500' :
                  networkStatus === 'offline' ? 'bg-rose-500' : 'bg-slate-400 animate-pulse'
                }`} />
                {networkStatus === 'stable' ? 'Kết nối mạng ổn định' :
                 networkStatus === 'weak' ? 'Kết nối mạng hơi chậm' :
                 networkStatus === 'poor' ? 'Độ trễ mạng cao' :
                 networkStatus === 'offline' ? 'Mất kết nối mạng' : 'Đang kiểm tra mạng...'}
              </Badge>
            </div>
          </div>
        </div>

        {/* 2-Column Studio Setup Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Left Column: Slide & Tips */}
          <div className="flex flex-col gap-6">
            {/* Slide Upload Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#19345d]">
                  <Icon name="description" className="text-blue-700" /> Tài liệu &amp; Slide thuyết trình
                </h2>
                <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/70">
                  PDF, PPT, PPTX • Tối đa 100 MB
                </Badge>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
                className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                  dragActive ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {file ? (
                  <div className="rounded-xl bg-white p-4 shadow-xs border border-slate-200/70">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
                        <Icon
                          name={file.file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'slideshow'}
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
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
                      Kéo thả slide của bạn vào đây hoặc{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-700 hover:underline cursor-pointer"
                      >
                        Duyệt tệp từ máy
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Hỗ trợ tập tin PDF (.pdf) hoặc bản trình chiếu PowerPoint (.ppt, .pptx)
                    </p>
                  </div>
                )}
              </div>

              {notice && (
                <Alert className="mt-3 bg-amber-50 border-amber-200 text-amber-800">
                  <AlertDescription className="text-xs font-medium text-amber-800">
                    {notice}
                  </AlertDescription>
                </Alert>
              )}
            </section>

            {/* Practical AI Presentation Tips Card */}
            <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#19345d]">
                <Icon name="tips_and_updates" className="text-amber-500 text-lg" />
                Bí quyết đạt điểm cao từ AI đánh giá 4 trụ cột
              </h3>
              <div className="mt-3 space-y-2.5 text-xs text-slate-600 leading-relaxed">
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#19345d]">
                  <Icon name="devices" className="text-blue-700" /> Kiểm tra Camera &amp; Micro
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${cameraState === 'ready' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    Cam: {cameraState === 'ready' ? 'Bật' : 'Tắt'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${micState === 'ready' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    Mic: {micState === 'ready' ? 'Bật' : 'Tắt'}
                  </span>
                </div>
              </div>

              {/* Video Screen Container - Clean, No Dashed Lines, No Face Tracking Box */}
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-inner">
                {cameraState === 'ready' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                      <Icon name="videocam" className="text-3xl text-slate-200" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-white">
                      {cameraState === 'error' ? 'Không thể truy cập camera' : 'Camera đang tắt'}
                    </p>
                    <p className="mt-1 text-xs text-slate-300 max-w-xs">
                      Bật camera để kiểm tra góc nhìn, ánh sáng và phong thái trước khi bắt đầu.
                    </p>
                    <button
                      type="button"
                      onClick={() => void toggleCamera()}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow cursor-pointer"
                    >
                      <Icon name="videocam" className="text-base" /> Bật Camera ngay
                    </button>
                  </div>
                )}

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
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Icon name="mic" className="text-blue-700 text-base" />
                      Trạng thái thu âm: <strong className="text-slate-900">{micLevel > 4 ? 'Đang nhận giọng nói' : 'Đang chờ âm thanh…'}</strong>
                    </span>
                    <span className="font-bold text-slate-800">Mức âm lượng: {Math.min(100, micLevel)}%</span>
                  </div>

                  <div
                    aria-label={`Mức âm thanh ${micLevel}%`}
                    className="mt-3 flex h-9 items-center gap-1 overflow-hidden rounded-lg bg-white px-2.5 border border-slate-200 shadow-2xs"
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
                  <p className="mt-2 text-[11px] text-slate-500">Micro đang thu âm tốt. Hãy nói thử vài câu để kiểm tra độ nhạy.</p>
                </div>
              )}

              {micError && <p role="alert" className="mt-2 text-xs text-rose-600">{micError}</p>}

              {/* Language Selection Box */}
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Icon name="translate" className="text-blue-700 text-base" /> Ngôn ngữ thuyết trình
                    </span>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      AI sẽ nhận diện giọng nói và hỗ trợ phân tích theo ngôn ngữ đã chọn
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label="Chọn ngôn ngữ thuyết trình"
                    className="flex items-center gap-1.5 rounded-lg bg-white p-1 border border-slate-200 shadow-2xs self-start sm:self-auto"
                  >
                    <button
                      type="button"
                      onClick={() => setLanguage('vi')}
                      aria-pressed={language === 'vi'}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                  <Button
                    type="button"
                    onClick={startPractice}
                    disabled={!canStartPractice}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 cursor-pointer disabled:bg-slate-300 disabled:text-white"
                  >
                    <Icon name="play_arrow" className="text-lg" /> Vào buổi thuyết trình
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Previous Presentation Sessions - Enterprise CRM Standard */}
        {(() => {
          const hasServerSessions = Boolean(serverSessionsQuery.data && serverSessionsQuery.data.data.length > 0);
          const rawServerList = serverSessionsQuery.data?.data || [];
          const query = historySearchQuery.trim().toLowerCase();

          const filteredServerList = query
            ? rawServerList.filter((s) => (s.title || 'Bài thuyết trình').toLowerCase().includes(query))
            : rawServerList;

          const filteredLocalList = query
            ? presentationHistory.filter((e) => (e.review.fileName || 'Bài thuyết trình').toLowerCase().includes(query))
            : presentationHistory;

          const totalCount = hasServerSessions ? rawServerList.length : presentationHistory.length;
          const displayCount = hasServerSessions ? filteredServerList.length : filteredLocalList.length;

          return (
            <Card className="mt-8 border border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden py-0 gap-0" aria-labelledby="presentation-history-title">
              <CardHeader className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle id="presentation-history-title" className="text-base font-bold text-[#19345d] flex items-center gap-2">
                  <History className="size-4.5 text-blue-600" />
                  Lịch sử phiên thuyết trình
                </CardTitle>
                <div className="flex items-center gap-2.5">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Tìm theo tên bài..."
                      className="pl-8 text-xs h-8.5 bg-slate-50/70 border-slate-200 focus-visible:bg-white focus-visible:ring-blue-600/20"
                    />
                  </div>
                  {totalCount > 0 && (
                    <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold tabular-nums whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-200/60">
                      {totalCount} phiên
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {serverSessionsQuery.isLoading ? (
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                      <span>Đang tải danh sách phiên từ hệ thống máy chủ...</span>
                    </div>
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                ) : hasServerSessions ? (
                  filteredServerList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[40%] min-w-[220px]">Phiên thuyết trình</TableHead>
                            <TableHead className="w-[20%] min-w-[140px]">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-slate-400" /> Thời gian
                              </span>
                            </TableHead>
                            <TableHead className="w-[12%] min-w-[100px]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-3.5 text-slate-400" /> Thời lượng
                              </span>
                            </TableHead>
                            <TableHead className="w-[14%] min-w-[120px] text-center">Trạng thái AI</TableHead>
                            <TableHead className="w-[14%] min-w-[120px] text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredServerList.map((session) => {
                            const isProcessing = session.status === 'processing';
                            const isFailed = session.status === 'failed';
                            const minutes = Math.floor(session.duration_seconds / 60).toString().padStart(2, '0');
                            const seconds = (session.duration_seconds % 60).toString().padStart(2, '0');
                            const durationLabel = `${minutes}:${seconds}`;

                            return (
                              <TableRow
                                key={session.id}
                                onClick={() => navigate(`/practice/review/${session.id}`)}
                                className="group cursor-pointer hover:bg-blue-50/40 transition-colors"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                                      isProcessing ? "bg-blue-100 text-blue-700 animate-pulse" : (isFailed ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700")
                                    )}>
                                      {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                        {session.title || 'Bài thuyết trình'}
                                      </p>
                                      <p className="text-[11px] text-slate-400 font-mono">
                                        ID: {session.id.slice(0, 8)}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-slate-600">
                                    {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.created_at))}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono font-medium text-slate-700 tabular-nums">
                                    {durationLabel}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {isProcessing ? (
                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium py-0.5 px-2.5">
                                      Đang phân tích
                                    </Badge>
                                  ) : isFailed ? (
                                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium py-0.5 px-2.5">
                                      Cần chấm lại
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium py-0.5 px-2.5">
                                      Hoàn thành
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/practice/review/${session.id}`)}
                                      className="h-8 px-2.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                    >
                                      {isProcessing ? 'Theo dõi' : 'Báo cáo'} <ArrowRight className="size-3.5 ml-1" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => void deleteSessionMutation.mutateAsync(session.id)}
                                      title="Xóa phiên này"
                                      aria-label={`Xóa bài ${session.title || 'thuyết trình'}`}
                                      className="size-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      <Search className="size-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Không tìm thấy phiên nào</p>
                      <p className="text-xs text-slate-400 mt-0.5">Không có phiên thuyết trình nào khớp với từ khóa "{historySearchQuery}".</p>
                    </div>
                  )
                ) : presentationHistory.length > 0 ? (
                  filteredLocalList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[40%] min-w-[220px]">Phiên thuyết trình</TableHead>
                            <TableHead className="w-[20%] min-w-[140px]">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-slate-400" /> Thời gian
                              </span>
                            </TableHead>
                            <TableHead className="w-[12%] min-w-[100px]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-3.5 text-slate-400" /> Thời lượng
                              </span>
                            </TableHead>
                            <TableHead className="w-[14%] min-w-[120px] text-center">Trạng thái</TableHead>
                            <TableHead className="w-[14%] min-w-[120px] text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLocalList.map((entry) => (
                            <TableRow
                              key={entry.id}
                              onClick={() => openHistoryEntry(entry)}
                              className="group cursor-pointer hover:bg-blue-50/40 transition-colors"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                    <FileText className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                      {entry.review.fileName || 'Bài thuyết trình'}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                      Cục bộ
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-slate-600">
                                  {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-mono font-medium text-slate-700 tabular-nums">
                                  {entry.review.duration}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium py-0.5 px-2.5">
                                  Hoàn thành
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openHistoryEntry(entry)}
                                    className="h-8 px-2.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                  >
                                    Báo cáo <ArrowRight className="size-3.5 ml-1" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      deletePresentationHistoryEntry(entry.id);
                                      syncHistory();
                                    }}
                                    title="Xóa phiên này"
                                    aria-label={`Xóa phiên ${entry.review.fileName || 'thuyết trình'}`}
                                    className="size-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      <Search className="size-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Không tìm thấy phiên nào</p>
                      <p className="text-xs text-slate-400 mt-0.5">Không có phiên thuyết trình nào khớp với từ khóa "{historySearchQuery}".</p>
                    </div>
                  )
                ) : (
                  <div className="py-12 px-4 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3 border border-slate-200/60">
                      <History className="size-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Chưa có phiên thuyết trình nào</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Sau khi hoàn thành bài thuyết trình, toàn bộ dữ liệu ghi nhận và phân tích AI sẽ xuất hiện tại bảng này.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-xs text-slate-500">
                <span>
                  Hiển thị <strong className="text-slate-800 font-semibold">{displayCount}</strong> / {totalCount} phiên gần nhất
                </span>
              </CardFooter>
            </Card>
          );
        })()}
      </div>
    </StudentPageLayout>
  );
};
