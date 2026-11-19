import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { extractSlideText } from '../api/slide';
import { preloadVisionTasks } from '../hooks/useMediaPipeTracking';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableColumnHeader, createDataTableColumnHelper } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VietnamFlag, UkFlag } from '@/components/ui/flags';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPresentationHistory, deletePresentationHistoryEntry, type PresentationHistoryEntry } from '../api/presentation-history';
import { usePresentationSessions, useDeletePresentation } from '../api/presentation-session';
import { cn } from '@/core/utils/cn';
import {
  FileText,
  History,
  ArrowRight,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Copy,
  Sparkles,
} from 'lucide-react';

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

type UnifiedSession = {
  id: string;
  title: string;
  badgeSub: string;
  createdAtFormatted: string;
  durationLabel: string;
  status: 'completed' | 'processing' | 'failed';
  isProcessing: boolean;
  isFailed: boolean;
  onOpen: () => void;
  onDelete: () => void;
  actionLabel: string;
};

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
  const serverSessionsQuery = usePresentationSessions();
  const deleteSessionMutation = useDeletePresentation();

  const syncHistory = () => setPresentationHistory(getPresentationHistory());

  useEffect(() => {
    // Warm up MediaPipe vision models in the background while user configures setup
    const timer = setTimeout(() => {
      void preloadVisionTasks().catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncHistory);
    return () => window.removeEventListener('storage', syncHistory);
  }, []);

  useEffect(() => {
    const handleOnline = () => setNetworkStatus('stable');
    const handleOffline = () => setNetworkStatus('offline');

    setNetworkStatus(typeof navigator !== 'undefined' && navigator.onLine ? 'stable' : 'offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
      setNotice('Vui lòng chọn file định dạng PDF.');
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
    window.open(file.url, '_blank', 'noopener,noreferrer');
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

  const historyColumns = useMemo(() => {
    const columnHelper = createDataTableColumnHelper<UnifiedSession>();
    return columnHelper.columns([
      columnHelper.accessor('title', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="PHIÊN THUYẾT TRÌNH" icon={FileText} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center py-0.5">
            <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
              {row.original.title}
            </span>
          </div>
        ),
        meta: { title: 'Phiên thuyết trình' },
      }),
      columnHelper.accessor('createdAtFormatted', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="THỜI GIAN" icon={Calendar} className="justify-center" />
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center justify-center text-center">
            <span className="text-xs text-slate-600 font-medium">
              {getValue() as string}
            </span>
          </div>
        ),
        meta: { title: 'Thời gian' },
      }),
      columnHelper.accessor('durationLabel', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="THỜI LƯỢNG" icon={Clock} className="justify-center" />
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center justify-center text-center">
            <span className="text-xs font-mono font-medium text-slate-700 tabular-nums">
              {getValue() as string}
            </span>
          </div>
        ),
        meta: { title: 'Thời lượng' },
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="TRẠNG THÁI AI" icon={Sparkles} className="justify-center" />
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-center text-center">
              {item.isProcessing ? (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium py-1 px-2.5 gap-1.5 shadow-2xs">
                  <Loader2 className="size-3.5 animate-spin text-blue-600 shrink-0" />
                  <span>Đang phân tích</span>
                </Badge>
              ) : item.isFailed ? (
                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium py-1 px-2.5 gap-1.5 shadow-2xs">
                  <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
                  <span>Cần chấm lại</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium py-1 px-2.5 gap-1.5 shadow-2xs">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Hoàn thành</span>
                </Badge>
              )}
            </div>
          );
        },
        filterFn: (row, id, value: string[]) => {
          if (!value || value.length === 0) return true;
          return value.includes(row.getValue(id));
        },
        meta: { title: 'Trạng thái AI' },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            THAO TÁC
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Tùy chọn cho bài ${item.title}`}
                      className="size-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44 bg-white p-1 rounded-xl shadow-md border border-slate-200">
                  <DropdownMenuItem onClick={item.onOpen} className="text-xs py-1.5 px-2 rounded-lg cursor-pointer">
                    <ArrowRight className="size-3.5 mr-2 text-blue-600" /> Xem chi tiết
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(item.id)}
                    className="text-xs py-1.5 px-2 rounded-lg cursor-pointer"
                  >
                    <Copy className="size-3.5 mr-2 text-slate-500" /> Sao chép ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 border-t border-slate-100" />
                  <DropdownMenuItem
                    onClick={item.onDelete}
                    className="text-xs py-1.5 px-2 rounded-lg cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                  >
                    <Trash2 className="size-3.5 mr-2" /> Xóa phiên
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableHiding: false,
      }),
    ]);
  }, []);

  const statusFacetedFilters = useMemo(
    () => [
      {
        columnId: 'status',
        title: 'Trạng thái',
        options: [
          { label: 'Hoàn thành', value: 'completed', icon: CheckCircle2 },
          { label: 'Đang phân tích', value: 'processing', icon: Loader2 },
          { label: 'Cần chấm lại', value: 'failed', icon: AlertCircle },
        ],
      },
    ],
    []
  );

  const canStartPractice = Boolean(file) && cameraState === 'ready' && micState === 'ready' && networkStatus !== 'offline';

  return (
    <StudentPageLayout active="/practice/setup" title="Chuẩn bị thuyết trình">
      <div className="mx-auto max-w-[1500px] pb-10">
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
                  PDF • Tối đa 100 MB
                </Badge>
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
                className={`rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
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
                      Chỉ hỗ trợ tập tin PDF (.pdf)
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
                {cameraState === 'ready' && (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-cover"
                  />
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
                      <VietnamFlag />
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
                      <UkFlag />
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
          const totalCount = hasServerSessions ? rawServerList.length : presentationHistory.length;

          const unifiedList: UnifiedSession[] = hasServerSessions
            ? rawServerList.map((s) => {
                const isProcessing = s.status === 'processing';
                const isFailed = s.status === 'failed';
                const minutes = Math.floor(s.duration_seconds / 60).toString().padStart(2, '0');
                const seconds = (s.duration_seconds % 60).toString().padStart(2, '0');
                return {
                  id: s.id,
                  title: s.title || 'Bài thuyết trình',
                  badgeSub: `ID: ${s.id.slice(0, 8)}`,
                  createdAtFormatted: new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.created_at)),
                  durationLabel: `${minutes}:${seconds}`,
                  status: isProcessing ? 'processing' : isFailed ? 'failed' : 'completed',
                  isProcessing,
                  isFailed,
                  onOpen: () => navigate(`/practice/review/${s.id}`),
                  onDelete: () => void deleteSessionMutation.mutateAsync(s.id),
                  actionLabel: isProcessing ? 'Theo dõi' : 'Báo cáo',
                };
              })
            : presentationHistory.map((e) => ({
                id: e.id,
                title: e.review.fileName || 'Bài thuyết trình',
                badgeSub: 'Cục bộ',
                createdAtFormatted: new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(e.createdAt)),
                durationLabel: e.review.duration,
                status: 'completed' as const,
                isProcessing: false,
                isFailed: false,
                onOpen: () => openHistoryEntry(e),
                onDelete: () => {
                  deletePresentationHistoryEntry(e.id);
                  syncHistory();
                },
                actionLabel: 'Báo cáo',
              }));

          return (
            <DataTable
              className="mt-8"
              header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs shrink-0">
                      <History className="size-5" />
                    </div>
                    <div>
                      <h2 id="presentation-history-title" className="text-base font-bold text-[#19345d] flex items-center gap-2.5">
                        Lịch sử phiên thuyết trình
                        {totalCount > 0 && (
                          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold tabular-nums bg-slate-100 text-slate-700 border border-slate-200/60">
                            {totalCount} phiên
                          </Badge>
                        )}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Quản lý, tìm kiếm và xem chi tiết báo cáo đánh giá AI cho các bài luyện tập của bạn.
                      </p>
                    </div>
                  </div>
                </div>
              }
              columns={historyColumns}
              data={unifiedList}
              searchKey="title"
              searchPlaceholder="Tìm theo tên bài..."
              facetedFilters={statusFacetedFilters}
              enableRowSelection={false}
              enableColumnVisibility={true}
              enablePagination={true}
              pageSize={5}
              pageSizeOptions={[5, 10, 20, 50]}
              isLoading={serverSessionsQuery.isLoading}
              onRowClick={(item) => item.onOpen()}
              emptyState={
                totalCount === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3 border border-slate-200/60">
                      <History className="size-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Chưa có phiên thuyết trình nào</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Sau khi hoàn thành bài thuyết trình, toàn bộ dữ liệu ghi nhận và phân tích AI sẽ xuất hiện tại bảng này.
                    </p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    <Search className="size-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Không tìm thấy phiên nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">Không có phiên thuyết trình nào khớp với bộ lọc hiện tại.</p>
                  </div>
                )
              }
            />
          );
        })()}
      </div>
    </StudentPageLayout>
  );
};
