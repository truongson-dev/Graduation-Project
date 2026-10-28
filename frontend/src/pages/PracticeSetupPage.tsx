import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { FaceDetector } from '@mediapipe/tasks-vision';
import { useLogout, useMe } from '../lib/auth';

type IconName = string;
type PracticeFile = { file: File; url: string };
type FaceCheck = {
  status: 'off' | 'loading' | 'not-detected' | 'multiple' | 'off-center' | 'too-close' | 'too-far' | 'ready' | 'unavailable';
  box: { left: number; top: number; width: number; height: number } | null;
};

const criteriaOptions = [
  { id: 'pace', label: 'Nhịp độ & tốc độ nói', icon: 'speed' },
  { id: 'filler', label: 'Lọc từ đệm (à, ừm)', icon: 'format_quote' },
  { id: 'eye-contact', label: 'Giao tiếp mắt', icon: 'visibility' },
  { id: 'logic', label: 'Tính logic & luận cứ', icon: 'psychology' },
];

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function faceStatusLabel(status: FaceCheck['status']) {
  const labels: Record<FaceCheck['status'], string> = {
    off: 'Chưa kiểm tra',
    loading: 'Đang khởi động AI nhận diện…',
    'not-detected': 'Chưa thấy khuôn mặt — hãy nhìn vào camera',
    multiple: 'Có nhiều người — hãy để một mình trong khung',
    'off-center': 'Đưa khuôn mặt vào giữa khung hình',
    'too-close': 'Bạn đang hơi gần — lùi ra một chút',
    'too-far': 'Bạn đang hơi xa — tiến lại gần camera',
    ready: 'Khuôn mặt nằm trong khung, khoảng cách phù hợp',
    unavailable: 'Chưa thể phân tích khuôn mặt',
  };
  return labels[status];
}

function distanceStatusLabel(status: FaceCheck['status']) {
  if (status === 'too-close') return 'Quá gần';
  if (status === 'too-far') return 'Quá xa';
  if (status === 'ready') return 'Tương đối phù hợp';
  if (status === 'multiple') return 'Đưa một người vào khung';
  if (status === 'off-center') return 'Căn lại vị trí';
  if (status === 'loading') return 'Đang đo tương đối…';
  return 'Chưa xác định';
}

export const PracticeSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useMe().data;
  const logout = useLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const [file, setFile] = useState<PracticeFile | null>(null);
  const [duration, setDuration] = useState(5);
  const [criteria, setCriteria] = useState<string[]>(criteriaOptions.map(({ id }) => id));
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [cameraState, setCameraState] = useState<'off' | 'ready' | 'error'>('off');
  const [faceCheck, setFaceCheck] = useState<FaceCheck>({ status: 'off', box: null });
  const [micState, setMicState] = useState<'off' | 'ready' | 'error'>('off');
  const [cameraError, setCameraError] = useState('');
  const [micError, setMicError] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (videoRef.current && cameraStreamRef.current) videoRef.current.srcObject = cameraStreamRef.current;
  }, [cameraState]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    faceDetectorRef.current?.close();
    if (cameraAnimationRef.current !== null) cancelAnimationFrame(cameraAnimationRef.current);
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    void audioContextRef.current?.close();
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
  }, []);

  const handleLogout = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    const extension = candidate.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'ppt', 'pptx'].includes(extension ?? '')) {
      setNotice('Vui lòng chọn file PDF, PPT hoặc PPTX.');
      return;
    }
    if (candidate.size > 50 * 1024 * 1024) {
      setNotice('File vượt quá giới hạn 50 MB.');
      return;
    }
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(candidate);
    fileUrlRef.current = url;
    setFile({ file: candidate, url });
    setNotice('');
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
      faceDetectorRef.current?.close();
      faceDetectorRef.current = null;
      if (cameraAnimationRef.current !== null) cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
      setFaceCheck({ status: 'off', box: null });
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraStreamRef.current = stream;
      setCameraState('ready');
      setFaceCheck({ status: 'loading', box: null });
      setCameraError('');

      const { FaceDetector: MediaPipeFaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm');
      const detector = await MediaPipeFaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.55,
      });
      if (cameraStreamRef.current !== stream) {
        detector.close();
        return;
      }
      faceDetectorRef.current?.close();
      faceDetectorRef.current = detector;

      let lastDetectionAt = 0;
      const detectFace = (now: number) => {
        if (cameraStreamRef.current !== stream) return;
        const video = videoRef.current;
        if (video?.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth && video.videoHeight && now - lastDetectionAt >= 180) {
          lastDetectionAt = now;
          try {
            const detections = detector.detectForVideo(video, now).detections
              .filter((detection) => (detection.categories[0]?.score ?? 0) >= 0.55 && detection.boundingBox)
              .sort((first, second) => (second.boundingBox?.width ?? 0) - (first.boundingBox?.width ?? 0));
            const boundingBox = detections[0]?.boundingBox;
            if (!boundingBox) {
              setFaceCheck({ status: 'not-detected', box: null });
            } else {
              const left = 1 - (boundingBox.originX + boundingBox.width) / video.videoWidth;
              const top = boundingBox.originY / video.videoHeight;
              const width = boundingBox.width / video.videoWidth;
              const height = boundingBox.height / video.videoHeight;
              const centerX = left + width / 2;
              const centerY = top + height / 2;
              const box = { left, top, width, height };
              const status: FaceCheck['status'] = detections.length > 1 ? 'multiple'
                : centerX < 0.3 || centerX > 0.7 || centerY < 0.16 || centerY > 0.78 ? 'off-center'
                : width > 0.36 ? 'too-close'
                : width < 0.13 ? 'too-far'
                : 'ready';
              setFaceCheck({ status, box });
            }
          } catch {
            setFaceCheck({ status: 'unavailable', box: null });
          }
        }
        cameraAnimationRef.current = requestAnimationFrame(detectFace);
      };
      cameraAnimationRef.current = requestAnimationFrame(detectFace);
    } catch {
      if (cameraStreamRef.current) {
        setFaceCheck({ status: 'unavailable', box: null });
        setCameraError('Camera vẫn hoạt động, nhưng chưa tải được mô hình nhận diện. Hãy kiểm tra kết nối Internet.');
      } else {
        setCameraState('error');
        setCameraError('Không thể truy cập camera. Hãy kiểm tra quyền của trình duyệt.');
      }
    }
  };

  const toggleMicrophone = async () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      await audioContextRef.current?.close();
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
      setMicError('Không thể truy cập microphone. Hãy kiểm tra quyền của trình duyệt.');
    }
  };

  const toggleCriterion = (id: string) => setCriteria((selected) => selected.includes(id)
    ? selected.filter((item) => item !== id)
    : [...selected, id]);

  const previewFile = () => {
    if (!file) return;
    if (file.file.type === 'application/pdf' || file.file.name.toLowerCase().endsWith('.pdf')) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    } else {
      setNotice('Đã chọn slide PowerPoint. Trình duyệt chưa hỗ trợ xem trực tiếp PPT/PPTX ở bước chuẩn bị.');
    }
  };

  const startPractice = () => {
    if (!file) {
      setNotice('Tải slide lên trước khi vào phòng luyện tập.');
      return;
    }
    navigate('/practice/live', { state: { practice: { file: file.file, duration, criteria, language } } });
  };

  const initials = user?.name?.trim().split(/\s+/).map((part) => part[0]).slice(-2).join('').toUpperCase() || 'HV';

  return (
    <div className="min-h-screen bg-[#f6f7fc] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-100 bg-white px-3 py-4 lg:flex">
        <Link to="/home" className="mb-5 flex h-12 items-center gap-3 px-2 text-[#19345d]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19345d] text-white"><Icon name="school" className="text-[22px]" /></span>
          <span className="text-lg font-bold tracking-tight">SoftSkill AI</span>
        </Link>
        <div className="mb-4 rounded-2xl bg-[#f4f2ff] p-3.5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#19345d]">{initials}</div><span className="truncate text-sm font-semibold">{user?.name ?? 'Học viên'}</span></div>
          <div className="mt-3 flex gap-2"><span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold"><Icon name="local_fire_department" className="text-amber-500" />7 Ngày Streak</span><span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold"><Icon name="bolt" className="text-teal-600" />1,250 XP</span></div>
        </div>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1.5">
          <Link to="/home" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Icon name="dashboard" />Trang chủ</Link>
          <Link to="/home#learning-path" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Icon name="route" />Lộ trình học</Link>
          <Link to="/practice/setup" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#19345d] px-3.5 py-3 text-sm font-semibold text-white shadow-sm"><Icon name="smart_toy" />AI Chấm bài &amp; Luyện tập</Link>
          <Link to="/practice/setup" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Icon name="interpreter_mode" />Phỏng vấn mô phỏng</Link>
          <Link to="/home#account" className="mt-3 flex items-center gap-3 border-t border-slate-100 px-3.5 pt-4 text-sm font-semibold text-slate-600 hover:text-[#19345d]"><Icon name="settings" />Cài đặt tài khoản</Link>
        </nav>
        <div className="mt-auto border-t border-slate-100 pt-3"><button type="button" onClick={handleLogout} disabled={logout.isPending} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"><Icon name="logout" />Đăng xuất</button></div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><Link to="/home" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#19345d] hover:bg-slate-100 lg:hidden" aria-label="Về trang chủ"><Icon name="arrow_back" /></Link><label className="relative hidden w-full max-w-lg sm:block"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400" /><input aria-label="Tìm kiếm" placeholder="Tìm kiếm kỹ năng, kịch bản giao tiếp, bài tập thực hành..." className="h-10 w-full rounded-xl bg-[#f6f7fc] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-teal-600/20" /></label><span className="font-bold text-[#19345d] sm:hidden">Chuẩn bị luyện tập</span></div>
          <div className="flex items-center gap-3 sm:gap-5"><span className="hidden rounded-full bg-[#f5f3ff] px-4 py-2 text-xs font-bold text-slate-700 sm:inline-flex"><Icon name="stars" className="mr-1 text-amber-500" />1,250 XP&nbsp; • &nbsp;Hạng Vàng</span><button type="button" aria-label="Thông báo" className="text-slate-500"><Icon name="notifications" /></button><div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">{initials}</div><span className="hidden text-sm font-semibold text-slate-700 md:block">{user?.name ?? 'Học viên'}</span></div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-6">
          <section className="mb-5 flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#19345d] text-white"><Icon name="videocam" className="text-[25px]" /></span><div><p className="text-xs font-semibold text-teal-700">AI CHẤM BÀI &amp; LUYỆN TẬP</p><h1 className="mt-1 text-lg font-bold leading-snug tracking-tight text-[#19345d] sm:text-xl lg:text-2xl">Chuẩn bị thuyết trình: Tải slide &amp; kiểm tra phòng thi ảo</h1></div></div>
            <ol aria-label="Các bước luyện tập" className="flex shrink-0 items-center gap-2 text-xs sm:gap-3"><li aria-current="step" className="flex items-center gap-2 rounded-full border border-[#19345d]/20 bg-indigo-50 px-3 py-2 font-bold text-[#19345d]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#19345d] text-white">1</span><span>Bước 1<br className="hidden sm:block" />Tải &amp; thiết bị</span></li><span className="h-px w-5 bg-slate-200 sm:w-8" /><li className="flex items-center gap-2 text-slate-400"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">2</span><span>AI phân tích</span></li><span className="h-px w-5 bg-slate-200 sm:w-8" /><li className="flex items-center gap-2 text-slate-400"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">3</span><span>Báo cáo</span></li></ol>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 xl:gap-6">
            <div className="flex min-w-0 flex-col gap-5">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold text-[#19345d]"><Icon name="description" />Tài liệu &amp; Slide thuyết trình</h2><span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700">PDF, PPT, PPTX • Tối đa 50 MB</span></div>
                <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" aria-label="Chọn slide thuyết trình" onChange={handleFileInput} />
                <div onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition sm:py-7 ${dragActive ? 'border-teal-500 bg-teal-50' : 'border-[#a7c4c8] bg-[#fafbff]'}`}>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Icon name="cloud_upload" className="text-[30px]" /></span>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Kéo thả slide của bạn vào đây hoặc <button type="button" onClick={() => fileInputRef.current?.click()} className="font-bold text-teal-800 underline underline-offset-2">Duyệt tệp</button></p>
                  <p className="mt-1 text-xs text-slate-500">Hỗ trợ PDF (.pdf), PowerPoint (.ppt, .pptx), tối đa 50 MB</p>
                </div>
                {file && <div className="mt-4 rounded-xl border border-slate-200 bg-[#f8f8ff] p-3 sm:p-3.5"><div className="flex flex-wrap items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Icon name={file.file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'slideshow'} className="text-2xl" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{file.file.name}</p><p className="mt-0.5 text-xs text-slate-500">{formatSize(file.file.size)} • Đã chọn trong phiên này</p></div><div className="flex w-full gap-2 sm:w-auto"><button type="button" onClick={previewFile} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:flex-none"><Icon name="visibility" />{file.file.name.toLowerCase().endsWith('.pdf') ? 'Xem trước' : 'Thông tin file'}</button><button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 sm:flex-none"><Icon name="swap_horiz" />Đổi file</button><button type="button" aria-label="Xóa slide" onClick={() => { URL.revokeObjectURL(file.url); fileUrlRef.current = null; setFile(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="close" /></button></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-full rounded-full bg-teal-700" /></div><p className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-teal-800"><Icon name="check_circle" />Sẵn sàng cho bước tiếp theo</p></div>}
                {notice && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{notice}</p>}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2"><Icon name="settings_suggest" className="text-xl text-[#19345d]" /><h2 className="text-lg font-bold text-[#19345d]">Cấu hình kịch bản &amp; tiêu chí chấm</h2></div>
                <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon name="schedule" className="text-teal-700" />Thời lượng mục tiêu</legend><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => setDuration(5)} aria-pressed={duration === 5} className={`rounded-xl border px-2 py-2.5 text-center transition ${duration === 5 ? 'border-2 border-[#19345d] bg-slate-100 text-[#19345d]' : 'border-slate-200 hover:border-slate-400'}`}><strong className="block text-base">5 Phút</strong><span className="text-[11px] text-slate-500">Ngắn gọn / Pitch</span></button><button type="button" onClick={() => setDuration(10)} aria-pressed={duration === 10} className={`rounded-xl border px-2 py-2.5 text-center transition ${duration === 10 ? 'border-2 border-[#19345d] bg-slate-100 text-[#19345d]' : 'border-slate-200 hover:border-slate-400'}`}><strong className="block text-base">10 Phút</strong><span className="text-[11px] text-slate-500">Đề án tiêu chuẩn</span></button><button type="button" onClick={() => setDuration(15)} aria-pressed={duration === 15} className={`rounded-xl border px-2 py-2.5 text-center transition ${duration === 15 ? 'border-2 border-[#19345d] bg-slate-100 text-[#19345d]' : 'border-slate-200 hover:border-slate-400'}`}><strong className="block text-base">15 Phút</strong><span className="text-[11px] text-slate-500">Bảo vệ toàn diện</span></button></div></fieldset>
                <fieldset className="mt-4"><legend className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><Icon name="rule" className="text-teal-700" />Tiêu chí AI tập trung phân tích</span><span className="text-[11px] font-normal text-slate-500">Đã chọn {criteria.length}/4</span></legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{criteriaOptions.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-[#f8f8ff] px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-300"><input type="checkbox" checked={criteria.includes(item.id)} onChange={() => toggleCriterion(item.id)} className="h-4 w-4 accent-blue-600" /><Icon name={item.icon} className="text-teal-700" /><span>{item.label}</span></label>)}</div></fieldset>
                <fieldset className="mt-4"><legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon name="language" className="text-teal-700" />Ngôn ngữ thuyết trình</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" aria-pressed={language === 'vi'} onClick={() => setLanguage('vi')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold ${language === 'vi' ? 'border-2 border-[#19345d] bg-slate-100 text-[#19345d]' : 'border-slate-200 hover:bg-slate-50'}`}><Icon name="check_circle" />Tiếng Việt (Mặc định)</button><button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold ${language === 'en' ? 'border-2 border-[#19345d] bg-slate-100 text-[#19345d]' : 'border-slate-200 hover:bg-slate-50'}`}><Icon name="translate" />English (IELTS/Global)</button></div></fieldset>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold text-[#19345d]"><Icon name="videocam" />Kiểm tra Camera</h2><span className={`flex items-center gap-1.5 text-xs font-semibold ${cameraState === 'ready' ? 'text-teal-800' : cameraState === 'error' ? 'text-rose-600' : 'text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${cameraState === 'ready' ? 'bg-teal-500' : cameraState === 'error' ? 'bg-rose-500' : 'bg-slate-300'}`} />{cameraState === 'ready' ? 'Camera sẵn sàng' : cameraState === 'error' ? 'Camera chưa kết nối' : 'Chưa kiểm tra'}</span></div>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#10284e] via-[#164a68] to-[#10a99b]">
                  {cameraState === 'ready' ? <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur"><Icon name="videocam" className="text-4xl" /></div><p className="mt-3 text-sm font-bold">{cameraState === 'error' ? 'Không thể mở camera' : 'Kiểm tra góc nhìn trước khi bắt đầu'}</p><p className="mt-1 text-xs text-blue-100">Đặt camera ngang tầm mắt, ngồi cách màn hình khoảng 50–70 cm</p></div>}
                  <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-2"><span className="rounded-lg bg-[#002045]/75 px-2.5 py-1.5 text-[10px] font-bold text-white"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${cameraState === 'ready' ? 'animate-pulse bg-teal-300' : 'bg-slate-300'}`} />CAMERA: {cameraState === 'ready' ? 'ON' : 'OFF'}</span><span className="rounded-lg bg-[#002045]/75 px-2.5 py-1.5 text-[10px] font-bold text-white">XEM TRƯỚC</span></div>
                  {cameraState === 'ready' && <><div className="pointer-events-none absolute inset-x-[22%] inset-y-[7%] rounded-2xl border border-dashed border-white/70 shadow-[0_0_18px_rgba(137,245,231,0.25)]" />{faceCheck.box && <div className={`pointer-events-none absolute rounded-xl border-2 transition-colors ${faceCheck.status === 'ready' ? 'border-teal-300 shadow-[0_0_18px_rgba(94,234,212,0.65)]' : 'border-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]'}`} style={{ left: `${faceCheck.box.left * 100}%`, top: `${faceCheck.box.top * 100}%`, width: `${faceCheck.box.width * 100}%`, height: `${faceCheck.box.height * 100}%` }} />}</>}
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#002045]/85 px-3 py-2 text-[11px] text-white"><span className={`flex items-center gap-1 ${faceCheck.status === 'ready' ? 'text-teal-200' : faceCheck.status === 'off' || faceCheck.status === 'loading' ? 'text-white' : 'text-amber-200'}`}><Icon name={faceCheck.status === 'ready' ? 'check_circle' : 'face'} />{cameraState === 'ready' ? faceStatusLabel(faceCheck.status) : 'Bật camera để kiểm tra khuôn mặt'}</span><span className="flex items-center gap-1"><Icon name="distance" />Khoảng cách: {cameraState === 'ready' ? distanceStatusLabel(faceCheck.status) : '—'}</span></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><Icon name="devices" className="text-teal-700" />{cameraState === 'ready' ? 'Camera đang hoạt động' : 'Camera chưa được bật'}</p><button type="button" onClick={() => void toggleCamera()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#19345d] hover:bg-slate-50">{cameraState === 'ready' ? 'Tắt camera' : 'Bật camera kiểm tra'}</button></div>
                {cameraError && <p role={cameraState === 'error' ? 'alert' : 'status'} className={`mt-2 text-xs ${cameraState === 'error' ? 'text-rose-600' : 'text-amber-700'}`}>{cameraError}</p>}
                {cameraState === 'ready' && !cameraError && <p aria-live="polite" className={`mt-2 text-xs font-medium ${faceCheck.status === 'ready' ? 'text-teal-800' : faceCheck.status === 'not-detected' || faceCheck.status === 'off-center' || faceCheck.status === 'too-close' || faceCheck.status === 'too-far' || faceCheck.status === 'multiple' ? 'text-amber-700' : 'text-slate-500'}`}>{faceStatusLabel(faceCheck.status)} <span className="font-normal text-slate-400">(ước lượng theo kích thước khuôn mặt, không phải đo centimet)</span></p>}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center gap-2"><Icon name="mic" className="text-xl text-[#19345d]" /><h2 className="text-lg font-bold text-[#19345d]">Kiểm tra Microphone &amp; âm thanh</h2></div>
                <div className="rounded-xl bg-[#f5f4ff] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>Cường độ âm lượng thu: <strong className={micState === 'ready' ? 'text-teal-800' : 'text-slate-500'}>{micState === 'ready' ? (micLevel > 4 ? 'Đang nhận giọng nói' : 'Đang chờ âm thanh') : 'Chưa kiểm tra'}</strong></span><span className="font-bold text-teal-800">{micState === 'ready' ? `Độ nhạy: ${Math.min(100, micLevel)}%` : 'Độ nhạy: —'}</span></div><div aria-label={`Mức âm thanh ${micLevel}%`} className="mt-3 flex h-10 items-center gap-1 overflow-hidden rounded-lg bg-white px-2">{Array.from({ length: 36 }, (_, index) => <span key={index} className="h-2 flex-1 rounded-full transition-all duration-75" style={{ height: `${micState === 'ready' ? 18 + Math.max(0, micLevel - index * 2) * 0.55 + ((index * 17) % 28) : 10 + ((index * 13) % 9)}px`, backgroundColor: micState === 'ready' && index < Math.ceil(micLevel / 3) ? '#006a61' : '#b9dedc' }} />)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-slate-500">{micState === 'ready' ? 'Hãy nói thử để xem thanh âm lượng' : 'Nói thử vài câu để kiểm tra âm thanh đầu vào'}</span><button type="button" onClick={() => void toggleMicrophone()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#19345d] shadow-sm hover:bg-slate-50"><Icon name={micState === 'ready' ? 'mic_off' : 'record_voice_over'} className="text-teal-700" />{micState === 'ready' ? 'Tắt microphone' : 'Thử giọng nói'}</button></div></div>
                {micError && <p role="alert" className="mt-2 text-xs text-rose-600">{micError}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f7f8fc] px-3 py-2 text-xs text-slate-600"><span className="flex items-center gap-2"><Icon name="wifi" className="text-teal-700" />Kết nối phòng luyện tập: <strong className="text-teal-800">Ổn định</strong></span><span className="rounded bg-white px-2 py-1 text-[10px] font-bold text-teal-800">Kiểm tra trực tiếp</span></div>
              </section>

              <section className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:p-5"><button type="button" onClick={startPractice} disabled={!file} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-[#002045] px-4 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#19345d] active:scale-[.99] disabled:cursor-not-allowed disabled:bg-slate-300"><Icon name="smart_toy" className="text-2xl" />Vào phòng thuyết trình</button><button type="button" onClick={() => navigate('/home')} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#f1f0fa] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"><Icon name="close" />Lưu nháp / Thoát</button></section>
              {!file && <p className="-mt-3 text-center text-xs text-slate-500">Tải slide lên để bật nút vào phòng luyện tập.</p>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
