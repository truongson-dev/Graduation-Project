import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AppIcon as Icon, StreakFlameIcon } from '@/components/layout/AppIcon';
import { CURRENT_TOURNAMENT } from '@/features/community/api/tournament';
import { MAX_LEARNING_LIVES, readLearningLives, type LearningLives } from '../api/learning-lives';
import { useLearningPaths } from '../api/learning-paths';
import bookIcon from '@/assets/learning/book-icon.png';
import dumbbellIcon from '@/assets/learning/dumbbell-icon.png';

function formatRefillTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-[#1cb0f6] fill-[#1cb0f6]' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function TreasureChestIcon({
  claimed = false,
  className = 'w-14 h-16',
}: {
  claimed?: boolean;
  className?: string;
}) {
  return (
    <img
      src={claimed ? '/chest-open.png' : '/chest-closed.png'}
      alt={claimed ? 'Hòm kho báu đã mở' : 'Hòm kho báu chưa mở'}
      className={`object-contain select-none pointer-events-none drop-shadow-md transition-transform duration-300 group-hover:scale-110 ${className}`}
      draggable={false}
    />
  );
}

type LearningNode = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  guidebook: { title: string; tips: string[] };
  lessons: string[];
};

const learningNodes: LearningNode[] = [
  {
    id: 'communication',
    title: 'Nghệ thuật đặt câu hỏi',
    subtitle: 'Làm chủ các dạng câu hỏi mở, đóng, làm rõ và đào sâu',
    icon: 'chat_bubble',
    guidebook: {
      title: 'Cẩm nang: Nghệ thuật đặt câu hỏi',
      tips: [
        'Câu hỏi mở (Ai, Cái gì, Thế nào): Mở rộng tư duy và thu thập góc nhìn đa chiều.',
        'Câu hỏi đóng (Có/Không): Dùng để xác nhận thông tin chốt hạ hoặc kiểm tra nhanh.',
        'Câu hỏi làm rõ: Xác định tiêu chí kết quả, thời hạn, phạm vi công việc tránh hiểu lầm.',
        'Kỹ thuật 5 Whys: Hỏi "Tại sao?" liên tiếp để truy vết nguyên nhân cốt lõi của vấn đề.',
      ],
    },
    lessons: [
      'Câu hỏi mở và câu hỏi đóng',
      'Câu hỏi làm rõ',
      'Câu hỏi đào sâu',
      '5 Whys và câu hỏi Socratic',
    ],
  },
  {
    id: 'listening',
    title: 'Lắng nghe chủ động',
    subtitle: 'Thấu hiểu trọn vẹn thông điệp và cảm xúc của người đối diện',
    icon: 'headphones',
    guidebook: {
      title: 'Cẩm nang: Lắng nghe chủ động',
      tips: [
        'Tập trung 100%: Tạm gác điện thoại và suy nghĩ riêng khi người khác đang nói.',
        'Nhận biết cảm xúc: Chú ý cả ngữ điệu và ngôn ngữ cơ thể.',
        'Nhắc lại ý chính: Tóm tắt lại để xác nhận bạn đã hiểu đúng ý người nói.',
      ],
    },
    lessons: [
      'Tập trung vào người nói',
      'Nhận biết ý chính và cảm xúc',
      'Đặt câu hỏi để làm rõ',
      'Phản hồi sau khi lắng nghe',
    ],
  },
  {
    id: 'feedback',
    title: 'Phản hồi tích cực',
    subtitle: 'Nghệ thuật góp ý xây dựng và tiếp nhận phản hồi bình tĩnh',
    icon: 'thumb_up',
    guidebook: {
      title: 'Cẩm nang: Phản hồi tích cực',
      tips: [
        'Mô hình SBI: Nêu Bối cảnh (Situation) → Hành vi (Behavior) → Tác động (Impact).',
        'Góp ý vì sự tiến bộ: Tránh công kích cá nhân, tập trung vào giải pháp.',
        'Tiếp nhận cởi mở: Lắng nghe góp ý như một món quà phát triển bản thân.',
      ],
    },
    lessons: [
      'Góp ý cụ thể và tôn trọng',
      'Tiếp nhận góp ý bình tĩnh',
      'Phản hồi trong tình huống khó',
    ],
  },
  {
    id: 'presentation',
    title: 'Thuyết trình cuốn hút',
    subtitle: 'Bố cục bài nói mạch lạc và phong thái tự tin trước đám đông',
    icon: 'slideshow',
    guidebook: {
      title: 'Cẩm nang: Thuyết trình cuốn hút',
      tips: [
        'Mở đầu gây ấn tượng: Đặt câu hỏi, kể câu chuyện hoặc dẫn chứng con số bất ngờ.',
        'Cấu trúc 3 phần: Mở bài thu hút - Thân bài cô đọng - Kết bài kêu gọi hành động.',
        'Tương tác ánh mắt: Duy trì eye-contact tự nhiên với khán giả.',
      ],
    },
    lessons: [
      'Xây dựng bố cục bài nói',
      'Mở đầu thu hút người nghe',
      'Trình bày luận điểm thuyết phục',
      'Kết thúc và trả lời câu hỏi',
    ],
  },
  {
    id: 'interview',
    title: 'Phỏng vấn chuyên nghiệp',
    subtitle: 'Chinh phục nhà tuyển dụng với phương pháp trả lời STAR',
    icon: 'work',
    guidebook: {
      title: 'Cẩm nang: Phỏng vấn chuyên nghiệp',
      tips: [
        'Mô hình STAR: Tình huống (Situation) - Nhiệm vụ (Task) - Hành động (Action) - Kết quả (Result).',
        'Giới thiệu bản thân trong 60 giây: Ngắn gọn, tập trung vào điểm mạnh và giá trị mang lại.',
        'Đặt câu hỏi ngược: Thể hiện sự chủ động và đam mê với công việc.',
      ],
    },
    lessons: [
      'Giới thiệu bản thân ngắn gọn',
      'Trả lời câu hỏi theo phương pháp STAR',
      'Xử lý câu hỏi tình huống',
      'Đặt câu hỏi cho nhà tuyển dụng',
    ],
  },
];

interface LearningSection {
  label: string;
  nodeId: string;
  status: 'completed' | 'current' | 'locked';
  progress: number;
  total: number;
  progressPercent?: number;
  quote?: string;
}

const learningSections: LearningSection[] = [
  { label: 'Phần 1', nodeId: 'communication', status: 'completed', progress: 4, total: 4, quote: 'Khởi đầu làm chủ kỹ năng mềm' },
  { label: 'Phần 2', nodeId: 'listening', status: 'completed', progress: 4, total: 4, quote: 'Thấu hiểu đối phương sâu sắc' },
  { label: 'Phần 3', nodeId: 'feedback', status: 'completed', progress: 3, total: 3, quote: 'Góp ý tích cực và chân thành' },
  { label: 'Phần 4', nodeId: 'presentation', status: 'current', progress: 1, total: 4, progressPercent: 2, quote: 'I can speak with people a little.' },
  { label: 'Phần 5', nodeId: 'interview', status: 'locked', progress: 0, total: 4, quote: 'Chinh phục phỏng vấn chuyên nghiệp' },
];

export const LearningPathPage: React.FC = () => {
  const navigate = useNavigate();
  const learningPathsQuery = useLearningPaths();
  const configuredPath = learningPathsQuery.data?.find((path) => path.slug === 'nghe-thuat-dat-cau-hoi') ?? learningPathsQuery.data?.[0];
  const configuredLessons = configuredPath?.lessons.slice().sort((a, b) => a.sort_order - b.sort_order).map((lesson) => lesson.title) ?? [];

  const [selectedId, setSelectedId] = useState('communication');
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(0);
  const [showGuidebook, setShowGuidebook] = useState(false);
  const [chestClaimed, setChestClaimed] = useState(false);
  const [viewMode, setViewMode] = useState<'path' | 'sections'>('path');

  const [lives, setLives] = useState<LearningLives>(() => readLearningLives());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (lives.count > 0 || !lives.refillAt) return;
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (lives.refillAt && now >= lives.refillAt) {
        setLives(readLearningLives(now));
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [lives.count, lives.refillAt]);

  const baseNode = learningNodes.find((node) => node.id === selectedId) ?? learningNodes[0];
  const selectedNode = baseNode.id === 'communication' && configuredLessons.length > 0
    ? { ...baseNode, title: configuredPath?.title ?? baseNode.title, subtitle: configuredPath?.subtitle ?? baseNode.subtitle, lessons: configuredLessons }
    : baseNode;

  const selectedSectionIndex = learningSections.findIndex((section) => section.nodeId === selectedId);
  const selectedSection = learningSections[selectedSectionIndex >= 0 ? selectedSectionIndex : 0];

  const currentLessonIndex =
    selectedSection.status === 'locked'
      ? 0
      : selectedSection.status === 'completed'
      ? selectedNode.lessons.length
      : selectedSection.progress ?? 1;

  const handleStartLesson = (targetLesson?: string) => {
    const lesson = targetLesson || (selectedLessonIndex !== null ? selectedNode.lessons[selectedLessonIndex] : selectedNode.lessons[0]) || '';
    navigate(`/lesson?topic=${encodeURIComponent(selectedNode.title)}&lesson=${encodeURIComponent(lesson)}`);
  };

  // Build Duolingo wave steps (lessons + milestone chest at middle + trophy at end)
  type PathItem =
    | { type: 'lesson'; index: number; title: string; complete: boolean; current: boolean; locked: boolean }
    | { type: 'chest'; index: number; title: string; claimed: boolean }
    | { type: 'trophy'; index: number; title: string };

  const pathItems: PathItem[] = [];
  selectedNode.lessons.forEach((lesson, index) => {
    const complete = index < currentLessonIndex;
    const current = index === currentLessonIndex;
    const locked = index > currentLessonIndex;
    pathItems.push({ type: 'lesson', index, title: lesson, complete, current, locked });
    // Insert milestone chest after 2nd lesson
    if (index === 1) {
      pathItems.push({ type: 'chest', index: 99, title: 'Hòm kho báu +15 KN', claimed: chestClaimed });
    }
  });
  pathItems.push({ type: 'trophy', index: 100, title: 'Vượt cửa kỹ năng' });

  // Duolingo serpentine offset pattern
  const cycle = [0, -48, -78, -48, 0, 48, 78, 48];
  const coordinates = pathItems.map((_, i) => ({
    x: 220 + cycle[i % cycle.length],
    y: 80 + i * 115,
  }));

  const mapHeight = coordinates[coordinates.length - 1].y + 140;

  return (
    <StudentPageLayout active="/learning-path" title="Lộ trình học" maxWidth="max-w-[1400px]" bgClassName="bg-white">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Column: either Sections List view (Image 3) or Snake Path view */}
        <main className="flex flex-col items-center w-full">
          {viewMode === 'sections' ? (
            <div className="w-full max-w-[580px] flex flex-col animate-in fade-in duration-200">
              {/* Header: ← Trở về */}
              <button
                type="button"
                onClick={() => setViewMode('path')}
                className="group inline-flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer py-1 self-start"
              >
                <Icon name="arrow_back" className="text-lg transition-transform group-hover:-translate-x-0.5" />
                <span>Trở về</span>
              </button>
              <div className="w-full border-b border-slate-200/80 mt-2 mb-5" />

              {/* Sections list */}
              <div className="space-y-3.5">
                {learningSections.map((sec) => {
                  const node = learningNodes.find((n) => n.id === sec.nodeId)!;
                  const isCompleted = sec.status === 'completed';
                  const isCurrent = sec.status === 'current';

                  if (isCurrent) {
                    const pct = sec.progressPercent ?? Math.round((sec.progress / sec.total) * 100);
                    return (
                      <div
                        key={sec.nodeId}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border-2 border-sky-200 bg-[#ddf4ff] p-5 sm:p-6 shadow-xs"
                      >
                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-[#213a61]">
                            {sec.label}
                          </h3>
                          <p className="text-xs font-bold text-sky-800 mt-0.5">
                            {node?.title}
                          </p>

                          {/* Progress bar with trophy */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="relative flex h-4 w-36 sm:w-48 items-center rounded-full bg-white p-0.5 shadow-inner border border-sky-100">
                              <div
                                className="h-full rounded-full bg-[#58cc02] transition-all"
                                style={{ width: `${Math.max(8, pct)}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-500">
                                {pct}%
                              </span>
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center text-[#58cc02]">
                              <Icon name="emoji_events" className="text-xl text-[#58cc02]" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(sec.nodeId);
                            setSelectedLessonIndex(0);
                            setViewMode('path');
                          }}
                          className="rounded-2xl bg-[#1cb0f6] px-8 py-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_#1899d6] transition-all hover:bg-[#1899d6] active:translate-y-1 active:shadow-none cursor-pointer shrink-0"
                        >
                          TIẾP TỤC
                        </button>
                      </div>
                    );
                  }

                  if (isCompleted) {
                    return (
                      <div
                        key={sec.nodeId}
                        className="flex items-center justify-between rounded-3xl border-2 border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300"
                      >
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-[#213a61]">
                            {sec.label}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#58cc02]">
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#58cc02] text-white">
                              <Icon name="check" className="text-[10px] font-black stroke-[3]" />
                            </div>
                            <span>HOÀN THÀNH!</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(sec.nodeId);
                            setSelectedLessonIndex(0);
                            setViewMode('path');
                          }}
                          className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider text-[#1cb0f6] shadow-[0_2px_0_#e2e8f0] transition-all hover:bg-slate-50 hover:border-slate-300 active:translate-y-0.5 active:shadow-none cursor-pointer"
                        >
                          ÔN TẬP
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={sec.nodeId}
                      className="flex items-center justify-between rounded-3xl border-2 border-slate-100 bg-slate-50/60 p-5 opacity-60"
                    >
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-400">
                          {sec.label}
                        </h3>
                        <p className="text-xs font-medium text-slate-400">
                          {node?.title}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                          <Icon name="lock" className="text-xs" />
                          <span>CHƯA MỞ KHÓA</span>
                        </div>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                        <Icon name="lock" className="text-lg" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Duolingo Sticky Unit Header Banner (Image 2) */}
              <div className="sticky top-[68px] z-30 w-full max-w-[580px] bg-white pt-2 pb-3 mb-6">
                <div className="w-full rounded-2xl bg-[#1cb0f6] px-5 sm:px-6 py-4 text-white shadow-md border-b-[5px] border-[#1899d6]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode('sections')}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white transition-all hover:bg-white/30 active:scale-95 cursor-pointer shrink-0 mr-0.5"
                          title="Quay lại danh sách lộ trình"
                          aria-label="Quay lại danh sách lộ trình"
                        >
                          <Icon name="arrow_back" className="text-base font-black" />
                        </button>
                        <span className="text-xs font-black uppercase tracking-wider text-sky-100">
                          {selectedSection.label} · CỬA {selectedSectionIndex + 1}
                        </span>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {selectedNode.lessons.length} BÀI HỌC
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                        {selectedNode.title}
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-sky-100 truncate">
                        Kỹ năng {selectedSectionIndex + 1}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGuidebook(true)}
                      className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-white/20 active:translate-y-0.5 cursor-pointer"
                    >
                      <Icon name="help_outline" className="text-xl" />
                      <span>HƯỚNG DẪN</span>
                    </button>
                  </div>
                </div>
              </div>

          {/* Interactive Path Container */}
          <div className="relative w-full max-w-[680px] overflow-visible pb-24" style={{ minHeight: mapHeight }}>
            {/* Nodes */}
            {pathItems.map((item, i) => {
              const coord = coordinates[i];
              if (item.type === 'chest') {
                return (
                  <div
                    key="chest"
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${(coord.x / 440) * 100}%`, top: `${coord.y}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => setChestClaimed((prev) => !prev)}
                      aria-label={chestClaimed ? 'Hòm kho báu đã nhận (+15 KN)' : 'Mở hòm kho báu thưởng (+15 KN)'}
                      className="group relative flex flex-col items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer focus:outline-none"
                    >
                      <TreasureChestIcon claimed={chestClaimed} className="w-16 h-18" />
                      {!chestClaimed ? (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md animate-bounce">
                          !
                        </span>
                      ) : (
                        <span className="absolute -bottom-2.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm whitespace-nowrap">
                          +15 KN
                        </span>
                      )}
                    </button>
                  </div>
                );
              }

              if (item.type === 'trophy') {
                return (
                  <div
                    key="trophy"
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${(coord.x / 440) * 100}%`, top: `${coord.y}px` }}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 border-4 border-slate-200 text-slate-400 shadow-md">
                      <Icon name="emoji_events" className="text-3xl text-amber-500" />
                    </div>
                  </div>
                );
              }

              const { index, title, complete, current, locked } = item;
              const selected = selectedLessonIndex === index;

              return (
                <div
                  key={title}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(coord.x / 440) * 100}%`,
                    top: `${coord.y}px`,
                    zIndex: selected ? 20 : 10,
                  }}
                >
                  {/* Floating 'BẮT ĐẦU' speech bubble indicator when current and not open */}
                  {current && !selected && (
                    <div className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                      <div className="relative rounded-2xl border-2 border-slate-200/90 bg-white px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#1cb0f6] shadow-md whitespace-nowrap">
                        BẮT ĐẦU
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-white" />
                      </div>
                    </div>
                  )}

                  {/* Circular 3D Node Button with Outer Ring */}
                  <div
                    className={`relative flex items-center justify-center rounded-full p-2.5 transition-all duration-200 ${
                      selected
                        ? 'bg-sky-100 ring-4 ring-[#1cb0f6]/40 scale-105'
                        : ''
                    }`}
                  >
                    {/* Active Donut Progress Ring */}
                    {current && (
                      <svg className="absolute -inset-2.5 h-[96px] w-[96px] -rotate-90 pointer-events-none">
                        <circle cx="48" cy="48" r="41" stroke="#e5e5e5" strokeWidth="6" fill="none" />
                        <circle
                          cx="48"
                          cy="48"
                          r="41"
                          stroke="#1cb0f6"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray="257"
                          strokeDashoffset="85"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}

                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedLessonIndex(selected ? null : index)}
                      aria-pressed={selected}
                      aria-label={`${title}${locked ? ', chưa mở khóa' : ''}`}
                      className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-white transition-all select-none ${
                        locked
                          ? 'bg-[#e5e5e5] border-b-[8px] border-[#afafaf] text-slate-400 cursor-not-allowed'
                          : 'bg-[#1cb0f6] border-b-[8px] border-[#1899d6] shadow-[0_6px_14px_rgba(28,176,246,0.35)] hover:brightness-105 active:translate-y-1.5 active:border-b-[2px] active:shadow-none cursor-pointer'
                      }`}
                    >
                      {/* 3D Gloss Highlight at top */}
                      {!locked && (
                        <div className="pointer-events-none absolute top-1.5 left-4 right-4 h-3 rounded-full bg-white/25" />
                      )}

                      {locked ? (
                        <Icon name="lock" className="text-2xl text-slate-400" />
                      ) : current ? (
                        <img
                          src={dumbbellIcon}
                          alt="Luyện tập"
                          className="w-10 h-8 object-contain pointer-events-none select-none drop-shadow-xs"
                        />
                      ) : (
                        <img
                          src={bookIcon}
                          alt="Bài học"
                          className="w-10 h-8 object-contain pointer-events-none select-none drop-shadow-xs"
                        />
                      )}
                    </button>
                  </div>

                  {/* Duolingo Speech Bubble Popup */}
                  {selected && !locked && (
                    <div className="absolute left-1/2 top-full mt-3.5 -translate-x-1/2 w-[280px] sm:w-[300px] z-20 animate-in fade-in zoom-in-95 duration-150">
                      {/* Upward notch arrow */}
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 h-0 w-0 border-x-[10px] border-x-transparent border-b-[10px] border-b-[#1cb0f6]"
                        aria-hidden="true"
                      />

                      {/* Card Body in Duolingo Blue */}
                      <div className="rounded-[22px] bg-[#1cb0f6] p-4.5 text-white shadow-2xl shadow-sky-950/25 border border-sky-400/40">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-100">
                            CỬA {selectedSectionIndex + 1} · BÀI {index + 1}
                          </span>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            +10 KN
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-base font-black text-white leading-snug tracking-tight">
                          {title}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-sky-100">
                          Bài học {index + 1} trên {selectedNode.lessons.length}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartLesson(title)}
                          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white py-3 px-4 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-[#1cb0f6] shadow-[0_4px_0_#1899d6] transition-all hover:bg-sky-50 active:translate-y-1 active:shadow-none cursor-pointer"
                        >
                          {complete ? 'ÔN TẬP +10 KN' : 'BẮT ĐẦU +10 KN'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>

        {/* Right Sidebar: Duolingo Stats, Quests & Tournament */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          {/* Top Bar Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div aria-label="Chuỗi 7 ngày" className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-orange-100 bg-white px-2 py-3 shadow-sm">
              <StreakFlameIcon className="text-xl" />
              <span className="text-xs font-black text-slate-700">7 ngày</span>
            </div>
            <div aria-label="1,250 KN" className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-sky-100 bg-white px-2 py-3 shadow-sm">
              <img src="/quest-xp.png" alt="KN" className="h-5 w-5 object-contain drop-shadow-xs" draggable={false} />
              <span className="text-xs font-black text-slate-700">1,250 KN</span>
            </div>
            <div
              aria-label={`${lives.count} tim`}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-sky-100 bg-white px-2 py-2 shadow-sm"
            >
              <div className="flex items-center gap-1">
                <HeartIcon active={lives.count > 0} />
                <span className="text-xs font-black text-slate-700 tabular-nums">
                  {lives.count}/{MAX_LEARNING_LIVES}
                </span>
              </div>
              {lives.count === 0 && lives.refillAt && (
                <span className="mt-0.5 text-[9px] font-semibold tabular-nums text-[#1cb0f6]">
                  {formatRefillTimer(lives.refillAt - currentTime)}
                </span>
              )}
            </div>
          </div>

          {/* Tournament / Leaderboards Card */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#213a61]">Giải đấu {CURRENT_TOURNAMENT.tier}</h2>
              <Link to="/achievements" className="text-[11px] font-black text-[#1cb0f6] hover:underline">
                BẢNG XẾP HẠNG
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span
                role="img"
                aria-label={`Huy hiệu ${CURRENT_TOURNAMENT.tier}`}
                className="h-14 w-14 shrink-0 bg-no-repeat"
                style={{
                  backgroundImage: "url('/achievement-tiers.png')",
                  backgroundSize: '500% 200%',
                  backgroundPosition: `${CURRENT_TOURNAMENT.tierColumn * 25}% ${CURRENT_TOURNAMENT.tierRow * 100}%`,
                }}
              />
              <div>
                <p className="text-xs font-extrabold text-[#213a61]">Bạn đang ở vị trí thứ 9</p>
                <p className="mt-0.5 text-xs text-emerald-600 font-bold">Thuộc nhóm thăng hạng!</p>
              </div>
            </div>
          </section>

          {/* Daily Quests Card */}
          <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#213a61]">Nhiệm vụ hàng ngày</h2>
              <Icon name="military_tech" className="text-xl text-amber-500" />
            </div>
            <div className="mt-4 space-y-4">
              {[
                { image: '/quest-xp.png', title: 'Kiếm 30 KN hôm nay', value: 20, total: 30 },
                { icon: 'task_alt', title: 'Hoàn thành 1 bài luyện tập', value: 1, total: 1, color: 'text-emerald-500' },
                { image: '/quest-timer.png', title: 'Luyện 5 phút kỹ năng mềm', value: 3, total: 5 },
              ].map((task) => {
                const isComplete = task.value >= task.total;
                return (
                  <div key={task.title} className="flex items-center gap-3">
                    {task.image ? (
                      <img
                        src={task.image}
                        alt={task.title}
                        className="h-7 w-7 shrink-0 object-contain drop-shadow-xs"
                        draggable={false}
                      />
                    ) : (
                      <Icon name={task.icon!} className={`shrink-0 text-2xl ${task.color}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-700 leading-tight">{task.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={Math.min(100, (task.value / task.total) * 100)} className="flex-1 h-2.5 bg-slate-100" />
                        <span className="shrink-0 text-[10px] font-black text-slate-500">{task.value}/{task.total}</span>
                      </div>
                    </div>
                    <img
                      src={isComplete ? '/chest-open.png' : '/chest-closed.png'}
                      alt={isComplete ? 'Đã nhận thưởng' : 'Chưa nhận'}
                      className="h-6 w-auto shrink-0 object-contain drop-shadow-xs"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      {/* Guidebook Modal (Hướng dẫn lý thuyết) */}
      {showGuidebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-[#1cb0f6]">
                  <Icon name="menu_book" className="text-2xl" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">HƯỚNG DẪN BÀI HỌC</span>
                  <h3 className="text-base font-black text-[#213a61]">{selectedNode.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidebook(false)}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedNode.guidebook.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl bg-sky-50/60 p-3.5 border border-sky-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1cb0f6] text-xs font-black text-white">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">{tip}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowGuidebook(false)}
              className="mt-6 w-full rounded-2xl bg-[#1cb0f6] py-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_#1899d6] transition-all hover:bg-[#1899d6] active:translate-y-1 active:shadow-none cursor-pointer"
            >
              ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}
    </StudentPageLayout>
  );
};
