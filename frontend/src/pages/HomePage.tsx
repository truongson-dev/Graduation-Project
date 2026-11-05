import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogout, useMe } from '../lib/auth';
import { BrandMark } from '../components/BrandMark';
import { useSidebarCollapsed } from '../lib/sidebar';
import { AppIcon as Icon, StreakFlameIcon } from '../components/Common/AppIcon';
import { hasCompletedLearningToday } from '../lib/daily-learning';

const navigation = [
  { label: 'Trang chủ', icon: 'home', to: '/home', section: 'home' },
  { label: 'Lộ trình học', icon: 'route', to: '/learning-path', section: 'learning' },
  { label: 'Luyện thuyết trình với AI', icon: 'record_voice_over', to: '/practice/setup', section: 'practice' },
  { label: 'Thành tích', icon: 'emoji_events', to: '/achievements', section: 'achievements' },
  { label: 'Cộng đồng', icon: 'forum', to: '/community', section: 'community' },
];

const supportTools = [
  { title: 'Luyện thuyết trình', description: 'Tải slide, kiểm tra thiết bị và nhận phản hồi AI.', icon: 'present_to_all', to: '/practice/setup', tone: 'bg-blue-50 text-blue-700' },
  { title: 'Xem kết quả AI chấm', description: 'Mở lại góp ý cho bài thuyết trình đã luyện.', icon: 'fact_check', to: '/practice/review', tone: 'bg-indigo-50 text-indigo-700' },
  { title: 'Cộng đồng tranh biện', description: 'Bình chọn ý kiến và tham gia phòng tranh biện trực tuyến.', icon: 'forum', to: '/community', tone: 'bg-sky-50 text-sky-700' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useMe().data;
  const logout = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();
  const firstName = user?.name?.trim().split(/\s+/).slice(-2).join(' ') || 'bạn';
  const hasCompletedToday = hasCompletedLearningToday();
  const currentWeekdayIndex = (new Date().getDay() + 6) % 7;
  const streakDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => ({
    day,
    isToday: index === currentWeekdayIndex,
    completed: index < currentWeekdayIndex
      ? index >= Math.max(0, currentWeekdayIndex - 3)
      : index === currentWeekdayIndex && hasCompletedToday,
  }));

  const handleLogout = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  const SidebarNav = ({ mobile = false, collapsed = false }: { mobile?: boolean; collapsed?: boolean }) => (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
      {navigation.map((item) => (
        <div key={item.section} className={`relative flex w-full items-center ${sidebarCollapsed && !mobile ? '' : 'gap-1'}`}>
          <Link to={item.to} title={collapsed && !mobile ? item.label : undefined} onClick={() => mobile && setMobileMenuOpen(false)}
            className={`flex min-w-0 flex-1 items-center rounded-xl py-2.5 text-[13px] font-semibold transition ${collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-3'} ${item.to === '/home' ? 'bg-blue-700 text-white shadow-sm' : 'text-blue-950 hover:bg-blue-50 hover:text-blue-700'}`}>
            <Icon name={item.icon} className="shrink-0 text-[19px]" />{(!collapsed || mobile) && <span>{item.label}</span>}
          </Link>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f1f4fa] text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white px-3 transition-[width] duration-200 lg:flex ${sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'}`}>
        <div className={`relative -mx-3 mb-4 flex h-[68px] shrink-0 items-center border-b border-slate-200/80 px-3 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {sidebarCollapsed ? <div className="group relative h-7 w-7"><Link to="/home" aria-label="SoftSkill AI - Trang chủ" className="block h-full w-full"><BrandMark className="h-7 w-7" /></Link><button type="button" aria-label="Mở rộng thanh bên" title="Mở thanh bên" onClick={toggleSidebarCollapsed} className="absolute -inset-0.5 hidden items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-blue-700 group-hover:flex group-focus-within:flex"><Icon name="left_panel_open" className="text-[18px]" /></button></div> : <><Link to="/home" aria-label="SoftSkill AI - Trang chủ" className="flex min-w-0 items-center gap-2.5 text-[#163762]"><BrandMark className="h-9 w-9 shrink-0" /><span className="text-[16px] font-extrabold tracking-tight">SoftSkill <span className="text-blue-600">AI</span></span></Link><button type="button" aria-label="Thu gọn thanh bên" title="Thu gọn thanh bên" onClick={toggleSidebarCollapsed} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-blue-700"><Icon name="left_panel_close" className="text-[18px]" /></button></>}
        </div>

        <SidebarNav collapsed={sidebarCollapsed} />
        <div className={`mt-auto flex items-center border-t border-slate-100 py-3 ${sidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-xs font-bold text-slate-800">{user?.name ?? 'Học viên'}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email ?? ''}</p>
            </div>
          )}
          <button type="button" onClick={handleLogout} disabled={logout.isPending} title="Đăng xuất" aria-label="Đăng xuất" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"><Icon name="logout" className="text-[19px]" /></button>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <button type="button" aria-label={mobileMenuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#163762] shadow-md transition hover:bg-blue-50 lg:hidden"><Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" /></button>

        {mobileMenuOpen && <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-100 bg-white p-4 pt-16 shadow-lg lg:hidden"><div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{user?.name ?? 'Học viên'}</p><p className="truncate text-xs text-slate-500">{user?.email ?? ''}</p></div><button type="button" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Icon name="logout" /></button></div><SidebarNav mobile /></div>}

        <main className="mx-auto max-w-[1720px] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-6">
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
                <div className="relative mt-auto pt-5"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-500">Tiến độ lộ trình</span><strong className="text-blue-700">60% <span className="font-medium text-slate-400">· 3 / 5 bài</span></strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" /></div><div className="mt-4 flex justify-end"><Link to="/learning-path" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white">Tiếp tục học <Icon name="arrow_forward" className="text-sm" /></Link></div></div>
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

          <section className="mt-7 grid items-start gap-5 lg:grid-cols-2">
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
                  <strong className={hasCompletedToday ? 'text-rose-600' : 'text-amber-700'}>
                    {hasCompletedToday ? 'Đã tính chuỗi' : 'Chưa hoàn thành'}
                  </strong>
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)]"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="checklist" className="text-blue-700" />Mục tiêu tuần</h2><span className="text-[10px] font-bold text-blue-700">2/3 hoàn thành</span></div><div className="mt-3 flex flex-col gap-3 text-xs"><p className="flex items-center gap-2 text-slate-600"><Icon name="check_circle" className="text-blue-700" />Luyện 1 bài phản xạ STAR (1/1) <span className="ml-auto text-blue-700">Đạt</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Thử thách phản biện 1:1 <span className="ml-auto">Đang làm</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Đạt 500 XP tuần <span className="ml-auto">390 / 500 XP</span></p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-blue-600" /></div></section>
          </section>
        </main>
      </div>
    </div>
  );
};
