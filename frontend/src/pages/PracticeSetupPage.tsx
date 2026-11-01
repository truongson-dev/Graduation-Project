import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { StudentPageLayout } from '../components/StudentPageLayout';
import { extractSlideText } from '../lib/slide';

type IconName = string;
type PracticeFile = { file: File; url: string };

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
  const [networkReady, setNetworkReady] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);

  useEffect(() => {
    type NetworkConnection = EventTarget & { effectiveType?: string; rtt?: number; downlink?: number };
    const nav = navigator as Navigator & { connection?: NetworkConnection; mozConnection?: NetworkConnection; webkitConnection?: NetworkConnection };
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    const updateNetworkStatus = () => {
      const slowConnection = connection?.effectiveType === 'slow-2g'
        || connection?.effectiveType === '2g'
        || (connection?.rtt !== undefined && connection.rtt > 500)
        || (connection?.downlink !== undefined && connection.downlink < 0.5);
      setNetworkReady(navigator.onLine && !slowConnection);
    };

    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    connection?.addEventListener('change', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      connection?.removeEventListener('change', updateNetworkStatus);
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
    if (candidate.size > 50 * 1024 * 1024) {
      setNotice('File vượt quá giới hạn dung lượng 50 MB.');
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
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${networkReady ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                <Icon name={networkReady ? 'wifi' : 'wifi_off'} className="text-sm" />
                {networkReady ? 'Kết nối mạng ổn định' : 'Mạng chưa ổn định'}
              </span>
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
                <span className="rounded-full bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  PDF, PPT, PPTX • Tối đa 50 MB
                </span>
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
                <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {notice}
                </p>
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
      </div>
    </StudentPageLayout>
  );
};
