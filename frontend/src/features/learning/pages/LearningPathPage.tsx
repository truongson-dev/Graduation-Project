import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AppIcon as Icon, StreakFlameIcon } from '@/components/layout/AppIcon';
import { markLearningCompletedToday } from '../api/daily-learning';
import { CURRENT_TOURNAMENT } from '@/features/community/api/tournament';
import { MAX_LEARNING_LIVES, readLearningLives, consumeLearningLife, type LearningLives } from '../api/learning-lives';

function formatRefillTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 ${active ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

type LearningNode = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  x: number;
  y: number;
  state: 'complete' | 'current' | 'locked';
  lessons: string[];
};

const learningNodes: LearningNode[] = [
  { id: 'confidence', title: 'Khởi động', subtitle: 'Làm quen hành trình', icon: 'flag', x: 63, y: 65, state: 'complete', lessons: ['Khám phá điểm mạnh của bạn', 'Đặt mục tiêu rèn luyện kỹ năng mềm', 'Nhận diện phong cách giao tiếp'] },
  { id: 'communication', title: 'Giao tiếp tự tin', subtitle: 'Kỹ năng 1', icon: 'chat_bubble', x: 37, y: 200, state: 'current', lessons: ['Diễn đạt ý tưởng rõ ràng', 'Bắt đầu và duy trì cuộc trò chuyện', 'Đặt câu hỏi đúng trọng tâm', 'Giao tiếp tự tin trong nhóm'] },
  { id: 'listening', title: 'Lắng nghe chủ động', subtitle: 'Kỹ năng 2', icon: 'headphones', x: 63, y: 335, state: 'locked', lessons: ['Tập trung vào người nói', 'Nhận biết ý chính và cảm xúc', 'Đặt câu hỏi để làm rõ', 'Phản hồi sau khi lắng nghe'] },
  { id: 'feedback', title: 'Phản hồi tích cực', subtitle: 'Kỹ năng 3', icon: 'thumb_up', x: 37, y: 470, state: 'locked', lessons: ['Góp ý cụ thể và tôn trọng', 'Tiếp nhận góp ý bình tĩnh', 'Phản hồi trong tình huống khó'] },
  { id: 'presentation', title: 'Thuyết trình cuốn hút', subtitle: 'Kỹ năng 4', icon: 'slideshow', x: 63, y: 605, state: 'locked', lessons: ['Xây dựng bố cục bài nói', 'Mở đầu thu hút người nghe', 'Trình bày luận điểm thuyết phục', 'Kết thúc và trả lời câu hỏi'] },
  { id: 'interview', title: 'Phỏng vấn chuyên nghiệp', subtitle: 'Kỹ năng 5', icon: 'work', x: 37, y: 740, state: 'locked', lessons: ['Giới thiệu bản thân ngắn gọn', 'Trả lời câu hỏi theo phương pháp STAR', 'Xử lý câu hỏi tình huống', 'Đặt câu hỏi cho nhà tuyển dụng'] },
  { id: 'mastery', title: 'Tự tin bứt phá', subtitle: 'Thử thách cuối', icon: 'stars', x: 63, y: 875, state: 'locked', lessons: ['Thực hành giao tiếp trong tình huống thực tế', 'Kết hợp kỹ năng thuyết trình và phản hồi', 'Tổng kết kế hoạch phát triển cá nhân'] },
];

const learningSections = [
  { label: 'Phần 1', nodeId: 'communication', status: 'current' as const, progress: 2, total: 4 },
  { label: 'Phần 2', nodeId: 'listening', status: 'locked' as const, progress: 0, total: 4 },
  { label: 'Phần 3', nodeId: 'feedback', status: 'locked' as const, progress: 0, total: 3 },
  { label: 'Phần 4', nodeId: 'presentation', status: 'locked' as const, progress: 0, total: 4 },
  { label: 'Phần 5', nodeId: 'interview', status: 'locked' as const, progress: 0, total: 4 },
];

function buildLessonPath(count: number) {
  if (count < 1) return '';
  let path = 'M 270 65';
  for (let index = 1; index < count; index += 1) {
    const previousX = (index - 1) % 2 === 0 ? 270 : 160;
    const nextX = index % 2 === 0 ? 270 : 160;
    const previousY = 65 + (index - 1) * 132;
    const nextY = 65 + index * 132;
    const midY = (previousY + nextY) / 2;
    path += ` C ${previousX} ${midY}, ${nextX} ${midY}, ${nextX} ${nextY}`;
  }
  return path;
}

export const LearningPathPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState('communication');
  const [showLessons, setShowLessons] = useState(false);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);
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

  const handleStartLesson = () => {
    setLessonStarted(true);
    markLearningCompletedToday();
  };
  const selectedNode = learningNodes.find((node) => node.id === selectedId) ?? learningNodes[1];
  const selectedSection = learningSections.find((section) => section.nodeId === selectedId) ?? learningSections[0];
  const currentLessonIndex = selectedNode.state === 'complete' ? selectedNode.lessons.length : selectedNode.state === 'current' ? Math.min(Math.floor(selectedNode.lessons.length * 0.6), selectedNode.lessons.length - 1) : 0;
  const lessonMapHeight = Math.max(500, 130 + selectedNode.lessons.length * 132);
  const lessonPath = buildLessonPath(selectedNode.lessons.length);
  const lessonProgressPath = buildLessonPath(selectedNode.state === 'complete' ? selectedNode.lessons.length : currentLessonIndex + 1);

  return (
    <StudentPageLayout active="/learning-path" title="Lộ trình học" maxWidth="max-w-[1420px]">
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
            <div aria-hidden="true" className="absolute -right-10 -top-24 h-64 w-64 rounded-full border-[30px] border-white/10" /><div aria-hidden="true" className="absolute -bottom-28 right-1/3 h-48 w-48 rounded-full border-[24px] border-white/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-100">LỘ TRÌNH KỸ NĂNG MỀM</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Mỗi bước nhỏ, thêm một kỹ năng mới</h2><p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-blue-50 sm:text-sm">Mỗi phần gồm chuỗi bài tập giúp bạn tự tin hơn trong học tập và công việc.</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><Icon name="route" className="text-2xl" /></div><div><p className="text-[10px] font-semibold text-blue-100">TIẾN ĐỘ HIỆN TẠI</p><p className="text-lg font-extrabold">1 / 5 <span className="text-xs font-semibold text-blue-100">phần</span></p></div></div></div>
          </section>

          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(26,54,93,.06)] sm:p-5">
              {showLessons ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button type="button" onClick={() => { setShowLessons(false); setLessonStarted(false); }} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"><Icon name="arrow_back" className="text-sm" />Tất cả các phần</button>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{selectedSection.label} · {selectedNode.subtitle}</p>
                      <h2 className="mt-1 text-lg font-extrabold text-[#213a61]">{selectedNode.title}</h2>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{selectedNode.lessons.length} bài luyện tập</span>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl bg-[#fbfcff]" aria-label={`Lộ trình bài luyện tập: ${selectedNode.title}`}>
                    <div className="relative mx-auto w-full max-w-[520px]" style={{ height: lessonMapHeight }}>
                      <svg aria-hidden="true" viewBox={`0 0 430 ${lessonMapHeight}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                        <path d={lessonPath} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={lessonProgressPath} fill="none" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {selectedNode.lessons.map((lesson, index) => {
                        const complete = selectedNode.state === 'complete' || index < currentLessonIndex;
                        const current = selectedNode.state !== 'complete' && index === currentLessonIndex;
                        const locked = selectedNode.state === 'locked' || index > currentLessonIndex;
                        const x = index % 2 === 0 ? 270 : 160;
                        const y = 65 + index * 132;
                        const selected = selectedLessonIndex === index;
                        const labelLeft = x > 215 ? '5%' : '55%';
                        const startLeft = x > 215 ? '27%' : '51%';
                        return <div key={lesson}>
                          <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(x / 430) * 100}%`, top: `${y}px` }}>
                            <button type="button" disabled={locked} onClick={() => { setSelectedLessonIndex(index); setLessonStarted(false); }} aria-pressed={selected} aria-label={`${lesson}${locked ? ', chưa mở khóa' : ''}`} className={`relative flex h-12 w-12 items-center justify-center rounded-full border-4 shadow-md transition ${complete ? 'border-white bg-gradient-to-br from-sky-400 to-blue-600 text-white' : current ? 'border-white bg-blue-700 text-white ring-4 ring-blue-100' : 'border-slate-100 bg-slate-200 text-slate-400'} ${selected ? 'ring-4 ring-blue-100' : ''} ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'}`}><Icon name={complete ? 'check' : locked ? 'lock' : 'school'} className="text-xl" /></button>
                          </div>
                          <div className="absolute z-10 w-[42%] max-w-[210px] -translate-y-1/2" style={{ left: labelLeft, top: `${y}px` }}>
                            <button type="button" disabled={locked} onClick={() => { setSelectedLessonIndex(index); setLessonStarted(false); }} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${selected ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white'} ${locked ? 'cursor-not-allowed opacity-55' : 'hover:border-blue-200 hover:bg-blue-50'}`}>
                              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">BÀI {index + 1}{complete ? ' · HOÀN THÀNH' : current ? ' · ĐANG HỌC' : ''}</span>
                              <span className="mt-0.5 block text-xs font-bold leading-snug text-[#213a61]">{lesson}</span>
                            </button>
                          </div>
                          {selected && !locked && <div className="absolute z-20 -translate-y-1/2" style={{ left: startLeft, top: `${y - 39}px` }}>
                            <button type="button" onClick={handleStartLesson} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-[10px] font-extrabold text-blue-700 shadow-lg shadow-blue-900/10 transition hover:bg-blue-50"><Icon name={lessonStarted ? 'check' : 'play_arrow'} className="text-sm" />{lessonStarted ? 'ĐANG HỌC' : complete ? 'ÔN TẬP' : 'BẮT ĐẦU'}</button>
                          </div>}
                        </div>;
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold text-[#213a61]">Lộ trình học</h2></div>
                  <div className="mt-4 space-y-3" aria-label="Các phần trong lộ trình">
                    {learningSections.map((section) => {
                      const node = learningNodes.find((item) => item.id === section.nodeId)!;
                      const locked = section.status === 'locked';
                      return <button key={section.nodeId} type="button" disabled={locked} onClick={() => { setSelectedId(node.id); setSelectedLessonIndex(node.state === 'complete' ? node.lessons.length - 1 : node.state === 'current' ? Math.min(Math.floor(node.lessons.length * 0.6), node.lessons.length - 1) : 0); setLessonStarted(false); setShowLessons(true); }} className={`w-full rounded-2xl border p-4 text-left transition ${locked ? 'cursor-not-allowed border-slate-100 bg-slate-50/70 opacity-65' : 'border-blue-200 bg-blue-50/40 shadow-sm hover:border-blue-300 hover:bg-blue-50'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${locked ? 'bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'}`}><Icon name={locked ? 'lock' : node.icon} className="text-xl" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{section.label}</span>
                              <Badge
                                variant={locked ? 'secondary' : 'default'}
                                className={`px-2 py-0.5 text-[9px] font-bold ${locked ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}
                              >
                                {locked ? 'CHƯA MỞ KHÓA' : 'ĐANG HỌC'}
                              </Badge>
                            </span>
                            <span className="mt-1 block truncate text-sm font-extrabold text-[#213a61]">{node.title}</span>
                          </span>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-extrabold ${locked ? 'bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'}`}>{locked ? <Icon name="lock" /> : <Icon name="play_arrow" />}{locked ? 'ĐANG KHÓA' : 'TIẾP TỤC'}</span>
                        </div>
                        {!locked && (
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={(section.progress / section.total) * 100} className="flex-1 h-2" />
                            <span className="text-[10px] font-bold text-slate-500">{section.progress}/{section.total} bài</span>
                          </div>
                        )}
                      </button>;
                    })}
                  </div>
                </>
              )}
            </section>

            <aside className="space-y-4 xl:sticky xl:top-6">
              <div className="grid grid-cols-3 gap-2">
                <div aria-label="Chuỗi 7 ngày" className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-100 bg-white px-2 py-3 shadow-sm">
                  <StreakFlameIcon className="text-xl" />
                  <span className="text-xs font-extrabold text-slate-700">7 ngày</span>
                </div>
                <div aria-label="1,250 XP" className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-white px-2 py-3 shadow-sm">
                  <Icon name="bolt" className="text-xl text-blue-500" />
                  <span className="text-xs font-extrabold text-slate-700">1,250 XP</span>
                </div>
                <div
                  aria-label={`${lives.count} tim`}
                  className="flex flex-col items-center justify-center rounded-xl border border-rose-100 bg-white px-2 py-2 shadow-sm"
                >
                  <div className="flex items-center gap-1">
                    <HeartIcon active={lives.count > 0} />
                    <span className="text-xs font-extrabold text-slate-700 tabular-nums">
                      {lives.count}/{MAX_LEARNING_LIVES}
                    </span>
                  </div>
                  {lives.count === 0 && lives.refillAt && (
                    <span className="mt-0.5 text-[9px] font-semibold tabular-nums text-rose-600">
                      {formatRefillTimer(lives.refillAt - currentTime)}
                    </span>
                  )}
                </div>
              </div>

              <section className="min-h-[150px] rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-slate-700">Giải đấu {CURRENT_TOURNAMENT.tier}</h2>
                  <Link to="/achievements" className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800">
                    XEM GIẢI ĐẤU
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
                    <p className="text-xs font-bold text-slate-700">Bạn đang ở vị trí thứ 9</p>
                    <p className="mt-1 text-xs text-slate-500">Cách nhóm xuống hạng 2 bậc!</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-slate-700">Nhiệm vụ hằng ngày</h2><button type="button" className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800">XEM TẤT CẢ</button></div>
                <div className="mt-4 space-y-5">
                  {[
                    { icon: 'bolt', title: 'Kiếm 20 KN', value: 13, total: 20, tone: 'text-amber-500' },
                    { icon: 'task_alt', title: 'Làm đúng 5 câu liên tiếp trong 2 bài học', value: 1, total: 2, tone: 'text-emerald-500' },
                    { icon: 'mic', title: 'Hoàn thành 7 bài tập nói', value: 2, total: 7, tone: 'text-sky-500' },
                  ].map((task) => (
                    <div key={task.title} className="flex items-center gap-3">
                      <Icon name={task.icon} className={`shrink-0 text-2xl ${task.tone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-snug text-slate-700">{task.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={Math.min(100, (task.value / task.total) * 100)} className="flex-1 h-2.5" />
                          <span className="shrink-0 text-[10px] font-bold text-slate-500">{task.value}/{task.total}</span>
                        </div>
                      </div>
                      <Icon name="redeem" className="shrink-0 text-xl text-amber-600" />
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
    </StudentPageLayout>
  );
};
