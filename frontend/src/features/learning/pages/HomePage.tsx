import { Link } from 'react-router';
import { useMe } from '@/features/auth/api/auth';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AppIcon as Icon, StreakFlameIcon } from '@/components/layout/AppIcon';
import { hasCompletedLearningToday } from '../api/daily-learning';

const tasks = [
  { icon: 'assignment', tone: 'bg-blue-100 text-blue-700', tag: 'Hôm nay', tagTone: 'bg-rose-50 text-rose-700', title: '1 bài tập slide cần AI chấm', detail: 'Bài Pitching Dự Án Khởi nghiệp: Kiểm tra bố cục và luận điểm.', action: 'Nộp ngay', xp: '+30 XP', to: '/practice/setup' },
  { icon: 'forum', tone: 'bg-sky-100 text-sky-700', tag: 'Đang chờ', tagTone: 'bg-amber-50 text-amber-700', title: 'Lời mời phòng phản biện ẩn danh', detail: 'Chủ đề: “Làm việc vượt giờ (OT) không lương vì trải nghiệm”.', action: 'Vào phòng', xp: 'Bắt đầu 20:30', to: '/community?tab=rooms' },
  { icon: 'groups', tone: 'bg-indigo-100 text-indigo-700', tag: 'Còn 2 ngày', tagTone: 'bg-slate-100 text-slate-600', title: 'Luyện phản xạ phỏng vấn vòng 2', detail: 'Bộ câu hỏi Behavioural Interview chuẩn tập đoàn.', action: 'Bắt đầu', xp: '+45 XP', to: '/practice/setup' },
];

const supportTools = [
  { title: 'Luyện thuyết trình', description: 'Tải slide, kiểm tra thiết bị và nhận phản hồi AI.', icon: 'present_to_all', to: '/practice/setup', tone: 'bg-blue-50 text-blue-700' },
  { title: 'Xem kết quả AI chấm', description: 'Mở lại góp ý cho bài thuyết trình đã luyện.', icon: 'fact_check', to: '/practice/review', tone: 'bg-indigo-50 text-indigo-700' },
  { title: 'Cộng đồng tranh biện', description: 'Bình chọn ý kiến và tham gia phòng tranh biện trực tuyến.', icon: 'forum', to: '/community', tone: 'bg-sky-50 text-sky-700' },
];

export const HomePage: React.FC = () => {
  const user = useMe().data;
  const firstName = user?.name?.trim().split(/\s+/).slice(-2).join(' ') || 'bạn';
  const hasCompletedToday = hasCompletedLearningToday();
  const currentWeekdayIndex = (new Date().getDay() + 6) % 7;
  const streakDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => ({
    day,
    isToday: index === currentWeekdayIndex,
    completed:
      index < currentWeekdayIndex
        ? index >= Math.max(0, currentWeekdayIndex - 3)
        : index === currentWeekdayIndex && hasCompletedToday,
  }));

  return (
    <StudentPageLayout active="/home" title="Trang chủ">
          <section className="relative isolate flex min-h-[210px] items-center overflow-hidden rounded-[28px] border border-white bg-[#d9f0ff] shadow-[0_16px_38px_rgba(37,99,235,.14)] sm:min-h-[230px] lg:min-h-[250px]">
            <img src="/career-hero-blue.png" alt="Con đường phát triển kỹ năng trên nền trời xanh" className="absolute inset-0 -z-20 h-full w-full object-fill" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-white/90 via-white/55 to-transparent" />
            <div className="max-w-2xl px-6 py-7 sm:px-9 lg:px-12">
              <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-[#142b50] sm:text-3xl lg:text-[36px]">Nền tảng AI hỗ trợ<br className="hidden sm:block" /> rèn luyện kỹ năng mềm</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-700 sm:text-base">Luyện giao tiếp, thuyết trình và phỏng vấn. Mỗi ngày tự tin hơn <span className="whitespace-nowrap">một bước.</span></p>
              <Link to="/practice/setup" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-700">Bắt đầu luyện tập <Icon name="arrow_forward" className="text-[18px]" /></Link>
            </div>
          </section>

          <section id="learning-path" className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold tracking-tight text-[#213a61] sm:text-xl">Thông tin học tập cá nhân</h2><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Lộ trình và hoạt động được thiết kế cho bạn.</p></div><span className="hidden items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 sm:inline-flex"><Icon name="auto_awesome" className="text-sm" />Đề xuất cho bạn</span></div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="group relative flex min-h-[218px] flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_18px_rgba(26,54,93,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,.12)] sm:p-6">
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-7 h-40 w-40 rounded-full bg-gradient-to-br from-blue-50 to-blue-200/80 blur-[1px]" /><div className="relative flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-[#233d64]">Lộ trình học của bạn</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"><Icon name="auto_awesome" className="mr-1 text-xs" />Đang học</span></div><p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Kỹ năng phản xạ &amp; thuyết phục trong phỏng vấn. Bài 3: Kỹ thuật STAR nâng cao.</p></div><span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:flex"><Icon name="route" className="text-2xl" /></span></div>
                <div className="relative mt-auto pt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Tiến độ lộ trình</span>
                    <strong className="text-blue-700">60% <span className="font-medium text-slate-400">· 3 / 5 bài</span></strong>
                  </div>
                  <Progress value={60} className="w-full h-2" />
                  <div className="mt-4 flex justify-end">
                    <Link to="/learning-path" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white">
                      Tiếp tục học <Icon name="arrow_forward" className="text-sm" />
                    </Link>
                  </div>
                </div>
              </article>
              <article className="group relative flex min-h-[218px] flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_18px_rgba(26,54,93,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,.12)] sm:p-6">
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-7 h-40 w-40 rounded-full bg-gradient-to-br from-sky-50 to-sky-200/90 blur-[1px]" /><div className="relative flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-[#233d64]">Luyện tập cùng AI</h3><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700">AI Mentor</span></div><p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Tải slide, luyện thuyết trình và nhận góp ý về nhịp nói, từ đệm, hướng nhìn và tư thế.</p></div><span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 sm:flex"><Icon name="psychology" className="text-2xl" /></span></div>
                <div className="relative mt-auto flex flex-wrap items-center justify-end gap-3 pt-5"><Link to="/practice/setup" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white">Xem chi tiết <Icon name="arrow_forward" className="text-sm" /></Link></div>
              </article>
            </div>
          </section>

          <section className="mt-7">
            <div className="mb-3"><h2 className="text-lg font-bold tracking-tight text-[#213a61] sm:text-xl">Công cụ hỗ trợ</h2><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Chọn một hoạt động để tiếp tục rèn luyện.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{supportTools.map((tool) => <Link key={tool.title} to={tool.to} className="group flex min-h-[124px] items-start gap-3.5 rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,.1)]"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tool.tone}`}><Icon name={tool.icon} className="text-[22px]" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#233d64]">{tool.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{tool.description}</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">Mở công cụ <Icon name="arrow_forward" className="text-sm transition group-hover:translate-x-0.5" /></span></span></Link>)}</div>
          </section>

          <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.85fr)] xl:gap-6">
            <div className="flex min-w-0 flex-col gap-7">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-[#213a61] sm:text-xl">Tác vụ cần hoàn thành</h2>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Một vài hoạt động đang chờ bạn.</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1">3 tác vụ</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">{tasks.map((task) => <article key={task.title} className="flex min-h-[205px] flex-col rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)] transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${task.tone}`}><Icon name={task.icon} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${task.tagTone}`}>{task.tag}</span></div><h3 className="mt-3 text-sm font-bold leading-snug text-slate-800">{task.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{task.detail}</p><div className="mt-auto flex items-center justify-between pt-4 text-[11px]"><span className="font-semibold text-slate-500">{task.xp}</span><Link to={task.to} className="font-bold text-blue-700 hover:underline">{task.action} ›</Link></div></article>)}</div>
              </section>

                          </div>

            <aside className="flex min-w-0 flex-col gap-4">

              <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)]">
                <div className="flex items-center gap-2">
                  <StreakFlameIcon className="text-xl" />
                  <h2 className="font-bold text-slate-800">Chuỗi học tập 7 ngày</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {hasCompletedToday
                    ? 'Bạn đã hoàn thành bài học hôm nay và giữ vững chuỗi.'
                    : 'Hoàn thành 1 bài trong lộ trình để giữ chuỗi hôm nay.'}
                </p>
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {streakDays.map(({ day, completed, isToday }) => (
                    <div key={day} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[9px] font-semibold ${isToday ? 'text-blue-700' : 'text-slate-400'}`}>
                        {day}
                      </span>
                      <span
                        role="img"
                        aria-label={`${day}: ${completed ? 'đã hoàn thành bài học' : 'chưa hoàn thành bài học'}`}
                        title={completed ? 'Đã hoàn thành bài học' : 'Chưa hoàn thành bài học'}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 bg-white text-transparent'
                        } ${isToday ? 'ring-2 ring-blue-100 ring-offset-1' : ''}`}
                      >
                        {completed && <Icon name="check" className="text-[15px]" />}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-slate-500">
                  <span>Tiến độ hôm nay</span>
                  <strong className={hasCompletedToday ? 'text-emerald-600' : 'text-amber-700'}>
                    {hasCompletedToday ? 'Đã tính chuỗi' : 'Chưa hoàn thành'}
                  </strong>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)]">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="checklist" className="text-blue-700" />Mục tiêu tuần</h2>
                  <Badge variant="outline" className="text-[10px] font-bold text-blue-700 border-blue-200 bg-blue-50/50">2/3 hoàn thành</Badge>
                </div>
                <div className="mt-3 flex flex-col gap-3 text-xs"><p className="flex items-center gap-2 text-slate-600"><Icon name="check_circle" className="text-blue-700" />Luyện 1 bài phản xạ STAR (1/1) <span className="ml-auto text-blue-700">Đạt</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Thử thách phản biện 1:1 <span className="ml-auto">Đang làm</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Đạt 500 XP tuần <span className="ml-auto">390 / 500 XP</span></p></div>
                <Progress value={(2 / 3) * 100} className="mt-3 w-full h-1.5" />
              </section>

                          </aside>
          </div>
    </StudentPageLayout>
  );
};
