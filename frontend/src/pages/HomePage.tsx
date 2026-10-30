import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogout, useMe } from '../lib/auth';
import { BrandMark } from '../components/BrandMark';
import { useSidebarCollapsed } from '../lib/sidebar';

const navigation = [
  { label: 'Trang chủ', icon: 'home', to: '/home', section: 'home' },
  { label: 'Lộ trình học', icon: 'route', to: '/learning-path', section: 'learning' },
  { label: 'Luyện phỏng vấn với AI', icon: 'record_voice_over', to: '/practice/setup', section: 'practice' },
  { label: 'Thành tích', icon: 'emoji_events', to: '/achievements', section: 'achievements' },
  { label: 'Cộng đồng', icon: 'forum', to: '/community', section: 'community' },
];

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

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function InitialAvatar({ initials, color, size = 'h-10 w-10' }: { initials: string; color: string; size?: string }) {
  return <div className={`${size} ${color} flex shrink-0 items-center justify-center rounded-full text-xs font-bold`}>{initials}</div>;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useMe().data;
  const logout = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = (user?.name ?? 'HV').split(/\s+/).map((part) => part[0]).slice(-2).join('').toUpperCase();
  const firstName = user?.name?.trim().split(/\s+/).slice(-2).join(' ') || 'bạn';

  const handleLogout = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  const SidebarNav = ({ mobile = false, collapsed = false }: { mobile?: boolean; collapsed?: boolean }) => (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
      {navigation.map((item) => (
        <div key={item.section} className={`relative flex w-full items-center ${sidebarCollapsed && !mobile ? '' : 'gap-1'}`}>
          <Link to={item.to} title={collapsed && !mobile ? item.label : undefined} onClick={() => mobile && setMobileMenuOpen(false)}
            className={`flex min-w-0 flex-1 items-center rounded-xl py-2.5 text-[13px] font-semibold transition ${collapsed && !mobile ? 'justify-center px-0' : 'gap-3 px-3'} text-slate-600 hover:bg-blue-50 hover:text-blue-700`}>
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
        <div className={`mt-auto border-t border-slate-100 pt-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`border-t border-slate-100 pt-2 ${sidebarCollapsed ? 'flex justify-center' : ''}`}><button type="button" onClick={handleLogout} disabled={logout.isPending} title={sidebarCollapsed ? 'Đăng xuất' : undefined} className={`flex items-center rounded-xl py-2.5 text-[13px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 ${sidebarCollapsed ? 'h-9 w-9 justify-center px-0' : 'w-full gap-3 px-3'}`}><Icon name="logout" className="text-[19px]" />{!sidebarCollapsed && 'Đăng xuất'}</button></div>
        </div>
      </aside>

      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header className={`fixed inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl transition-[left] duration-200 sm:px-6 ${sidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[260px]'} lg:px-8`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button type="button" aria-label="Mở điều hướng" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#163762] hover:bg-blue-50 lg:hidden"><Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" /></button>
            <label className="relative hidden w-full max-w-2xl sm:block"><Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-slate-400" /><input aria-label="Tìm kiếm" placeholder="Tìm kỹ năng, lộ trình học, bài tập thực hành..." className="h-10 w-full rounded-xl border border-slate-100 bg-[#f5f7fc] pl-10 pr-4 text-sm outline-none transition focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-500/15" /></label>
            <Link to="/home" className="flex items-center gap-2 text-[#163762] sm:hidden"><BrandMark className="h-9 w-9" /><span className="font-bold">SoftSkill AI</span></Link>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-4">
            <button type="button" aria-label="Thông báo" className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><Icon name="notifications" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>
            <div className="hidden h-8 border-l border-slate-200 sm:block" />
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu" aria-label="Thông tin sinh viên và đăng xuất" className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-blue-50">
                <InitialAvatar initials={initials} color="bg-blue-100 text-blue-800" size="h-8 w-8" />
                <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 md:block">{user?.name ?? 'Học viên'}</span>
              </button>
              {profileOpen && <div role="menu" className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center gap-3 bg-blue-50/80 p-4"><InitialAvatar initials={initials} color="bg-white text-blue-800 shadow-sm" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{user?.name ?? 'Học viên'}</p><p className="truncate text-xs text-slate-500">{user?.email ?? 'Tài khoản sinh viên'}</p></div></div>
                <div className="p-2"><p className="px-2.5 py-2 text-[11px] font-semibold text-slate-500">Tài khoản học viên SkillBridge</p><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); handleLogout(); }} disabled={logout.isPending} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><Icon name="logout" className="text-[18px]" />Đăng xuất</button></div>
              </div>}
            </div>
          </div>
        </header>

        {mobileMenuOpen && <div className="fixed inset-x-0 top-[68px] z-40 border-b border-slate-100 bg-white p-4 shadow-lg lg:hidden"><SidebarNav mobile /><button type="button" onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 border-t border-slate-100 px-3 pt-4 text-sm font-semibold text-slate-500"><Icon name="logout" />Đăng xuất</button></div>}

        <main className="mx-auto max-w-[1720px] px-4 pb-10 pt-[84px] sm:px-6 lg:px-8">
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

          <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.85fr)] xl:gap-6">
            <div className="flex min-w-0 flex-col gap-7">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold tracking-tight text-[#213a61] sm:text-xl">Tác vụ cần hoàn thành</h2><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Một vài hoạt động đang chờ bạn.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">3 tác vụ</span></div>
                <div className="grid gap-3 md:grid-cols-3">{tasks.map((task) => <article key={task.title} className="flex min-h-[205px] flex-col rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)] transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${task.tone}`}><Icon name={task.icon} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${task.tagTone}`}>{task.tag}</span></div><h3 className="mt-3 text-sm font-bold leading-snug text-slate-800">{task.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{task.detail}</p><div className="mt-auto flex items-center justify-between pt-4 text-[11px]"><span className="font-semibold text-slate-500">{task.xp}</span><Link to={task.to} className="font-bold text-blue-700 hover:underline">{task.action} ›</Link></div></article>)}</div>
              </section>

                          </div>

            <aside className="flex min-w-0 flex-col gap-4">

              <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)]"><div className="flex items-center gap-2"><Icon name="local_fire_department" className="text-amber-500" /><h2 className="font-bold text-slate-800">Chuỗi 7 ngày streak</h2></div><p className="mt-1 text-xs text-slate-500">Duy trì thêm 3 ngày để nhận huy hiệu “Chiến binh kỷ luật 10D”.</p><div className="mt-4 grid grid-cols-7 gap-1.5">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <div key={day} className="flex flex-col items-center gap-1"><span className="text-[9px] text-slate-400">{day}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Icon name="check" className="text-[15px]" /></span></div>)}</div><div className="mt-4 flex justify-between text-[10px] text-slate-500"><span>Mục tiêu học hôm nay</span><strong className="text-blue-800">15 / 20 phút</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-blue-600" /></div></section>

              <section className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_14px_rgba(26,54,93,.05)]"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="checklist" className="text-blue-700" />Mục tiêu tuần</h2><span className="text-[10px] font-bold text-blue-700">2/3 hoàn thành</span></div><div className="mt-3 flex flex-col gap-3 text-xs"><p className="flex items-center gap-2 text-slate-600"><Icon name="check_circle" className="text-blue-700" />Luyện 1 bài phản xạ STAR (1/1) <span className="ml-auto text-blue-700">Đạt</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Thử thách phản biện 1:1 <span className="ml-auto">Đang làm</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Đạt 500 XP tuần <span className="ml-auto">390 / 500 XP</span></p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-blue-600" /></div></section>

                          </aside>
          </div>
        </main>
      </div>
    </div>
  );
};
