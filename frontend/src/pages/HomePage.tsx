import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogout, useMe } from '../lib/auth';

const navigation = [
  { label: 'Trang chủ', icon: 'dashboard', to: '/home', section: 'home' },
  { label: 'Lộ trình học', icon: 'route', to: '/home#learning-path', section: 'learning' },
  { label: 'AI Chấm bài & Luyện tập', icon: 'smart_toy', to: '/coach', section: 'practice' },
  { label: 'Phỏng vấn mô phỏng', icon: 'interpreter_mode', to: '/coach', section: 'interview' },
  { label: 'Cài đặt tài khoản', icon: 'settings', to: '/home#account', section: 'account' },
];

const leaderboard = [
  { name: 'Minh Anh', school: 'ĐH Ngoại Thương (FTU)', xp: 480, initials: 'MA', color: 'bg-rose-100 text-rose-700' },
  { name: 'Đức Huy', school: 'ĐH Bách Khoa Hà Nội', xp: 430, initials: 'ĐH', color: 'bg-sky-100 text-sky-700' },
  { name: 'Thu Hà', school: 'ĐH Kinh Tế Quốc Dân', xp: 410, initials: 'TH', color: 'bg-amber-100 text-amber-700' },
];

const tasks = [
  { icon: 'assignment', tone: 'bg-blue-100 text-blue-700', tag: 'Hôm nay', tagTone: 'bg-rose-50 text-rose-700', title: '1 bài tập slide cần AI chấm', detail: 'Bài Pitching Dự Án Khởi nghiệp: Kiểm tra bố cục và luận điểm.', action: 'Nộp ngay', xp: '+30 XP' },
  { icon: 'forum', tone: 'bg-teal-100 text-teal-700', tag: 'Đang chờ', tagTone: 'bg-amber-50 text-amber-700', title: 'Lời mời phòng phản biện ẩn danh', detail: 'Chủ đề: “Làm việc vượt giờ (OT) không lương vì trải nghiệm”.', action: 'Vào phòng', xp: 'Bắt đầu 20:30' },
  { icon: 'groups', tone: 'bg-violet-100 text-violet-700', tag: 'Còn 2 ngày', tagTone: 'bg-slate-100 text-slate-600', title: 'Luyện phản xạ phỏng vấn vòng 2', detail: 'Bộ câu hỏi Behavioural Interview chuẩn tập đoàn.', action: 'Bắt đầu', xp: '+45 XP' },
];

const discussionPosts = [
  {
    author: 'Bảo Trâm',
    meta: 'Sinh viên năm 4 • Ngoại Thương (FTU)',
    time: '3 giờ trước',
    title: 'Sếp giao việc mơ hồ, không deadline: Nên chủ động làm nháp theo suy đoán hay dừng lại nhắn rõ?',
    body: '“Sếp giao task gấp qua chat nhưng mô tả chỉ vỏn vẹn 2 dòng và không nói rõ deadline cụ thể. Nếu hỏi nhiều thì sợ sếp đánh giá thụ động, thiếu nhạy bén. Còn nếu tự đoán để làm luôn thì rủi ro lệch định hướng rất cao. Nếu là bạn trong kỳ thực tập, bạn sẽ xử lý thế nào để ghi điểm tác phong chuyên nghiệp?”',
    votes: '246 sinh viên đã biểu quyết',
    comments: 18,
    initials: 'BT',
    color: 'bg-pink-100 text-pink-700',
  },
  {
    author: 'Quốc Trung',
    meta: 'Cựu sinh viên Bách Khoa TP.HCM',
    time: '5 giờ trước',
    title: 'Bị đồng nghiệp cùng nhóm vô tình nhận hết công lao trong buổi họp tổng kết dự án với Director?',
    body: 'Làm thế nào để đính chính sự thật mà không biến buổi họp thành màn tranh giành công trạng hay gây mất hòa khí nội bộ?',
    votes: '32 sinh viên tham gia phản biện',
    comments: 6,
    initials: 'QT',
    color: 'bg-cyan-100 text-cyan-700',
  },
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
  const firstName = user?.name?.trim().split(/\s+/).slice(-2).join(' ') || 'bạn';

  const handleLogout = () => {
    logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });
  };

  const SidebarNav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-1.5">
      {navigation.map((item, index) => (
        <div key={item.section} className={index === 4 ? 'mt-3 border-t border-slate-100 pt-3' : ''}>
          <Link
            to={item.to}
            onClick={() => mobile && setMobileMenuOpen(false)}
            aria-current={item.section === 'home' ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${item.section === 'home' ? 'bg-[#19345d] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-[#19345d]'}`}
          >
            <Icon name={item.icon} className="text-[20px]" />
            <span>{item.label}</span>
          </Link>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f6f7fc] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-100 bg-white px-3 py-4 lg:flex">
        <Link to="/home" className="mb-5 flex h-12 items-center gap-3 px-2 text-[#19345d]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19345d] text-white shadow-sm"><Icon name="school" className="text-[22px]" /></span>
          <span className="text-lg font-bold tracking-tight">SoftSkill AI</span>
        </Link>

        <div className="mb-4 rounded-2xl bg-[#f4f2ff] p-3.5">
          <div className="flex items-center gap-3">
            <InitialAvatar initials={(user?.name ?? 'HV').split(/\s+/).map((part) => part[0]).slice(-2).join('')} color="bg-white text-[#19345d]" />
            <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{user?.name ?? 'Học viên'}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-slate-700"><Icon name="local_fire_department" className="text-[15px] text-amber-500" />7 Ngày Streak</span>
            <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-slate-700"><Icon name="bolt" className="text-[15px] text-teal-600" />1,250 XP</span>
          </div>
        </div>

        <SidebarNav />
        <div className="mt-auto border-t border-slate-100 pt-3">
          <button type="button" onClick={handleLogout} disabled={logout.isPending} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-60">
            <Icon name="logout" className="text-[20px]" />Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:left-60 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button type="button" aria-label="Mở điều hướng" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#19345d] hover:bg-slate-100 lg:hidden">
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" />
            </button>
            <label className="relative hidden w-full max-w-lg sm:block">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400" />
              <input aria-label="Tìm kiếm" placeholder="Tìm kiếm kỹ năng, kịch bản giao tiếp, bài tập thực hành..." className="h-10 w-full rounded-xl bg-[#f6f7fc] pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-teal-600/20" />
            </label>
            <Link to="/home" className="flex items-center gap-2 text-[#19345d] sm:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19345d] text-white"><Icon name="school" /></span>
              <span className="font-bold">SoftSkill AI</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button type="button" aria-label="Thông báo" className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><Icon name="notifications" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /></button>
            <button type="button" aria-label="Tùy chỉnh" className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 sm:flex"><Icon name="tune" /></button>
            <div className="hidden h-7 border-l border-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <InitialAvatar initials={(user?.name ?? 'HV').split(/\s+/).map((part) => part[0]).slice(-2).join('')} color="bg-teal-100 text-teal-800" size="h-8 w-8" />
              <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 md:block">{user?.name ?? 'Học viên'}</span>
            </div>
          </div>
        </header>

        {mobileMenuOpen && <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-100 bg-white p-4 shadow-lg lg:hidden"><SidebarNav mobile /><button type="button" onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 border-t border-slate-100 px-3.5 pt-4 text-sm font-semibold text-slate-500"><Icon name="logout" />Đăng xuất</button></div>}

        <main className="mx-auto max-w-[1600px] px-4 pb-8 pt-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.9fr)] xl:gap-6">
            <div className="flex min-w-0 flex-col gap-5">
              <section className="relative flex min-h-44 items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#10284e] via-[#173c72] to-[#087f83] p-5 text-white shadow-lg sm:min-h-48 sm:p-7">
                <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[34px] border-white/5" />
                <div aria-hidden="true" className="absolute right-24 -bottom-32 h-64 w-64 rounded-full border-[28px] border-teal-200/10" />
                <div className="relative z-10 flex w-full flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-xl">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Hành trình của bạn</p>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Chào buổi sáng, {firstName}!</h1>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">Sẵn sàng hoàn thành bài thực hành hôm nay? Đạt thêm 50 XP để giữ vững vị thế tuần này.</p>
                    <p className="mt-3 flex items-center gap-2 text-xs text-teal-100"><span className="h-2 w-2 rounded-full bg-teal-300" />Đang trong chuỗi học tập tích cực</p>
                  </div>
                  <div className="flex items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm sm:self-center sm:px-4 sm:py-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#68ead7 0% 75%, rgba(255,255,255,.2) 75% 100%)' }}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#173b70] text-sm font-bold">75%</div>
                    </div>
                    <div><div className="text-xs font-bold">Tiến độ tuần</div><div className="mt-1 text-[11px] text-blue-100">6/8 kỹ năng trọng điểm</div></div>
                  </div>
                </div>
              </section>

              <section id="learning-path" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon name="menu_book" /></span><div><p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Đang tiếp tục lộ trình</p><p className="mt-0.5 text-xs text-slate-400">Module 3 / 5</p></div></div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">Module 3 / 5</span>
                </div>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-slate-800 sm:text-lg">Kỹ năng phản xạ &amp; thuyết phục trong phỏng vấn</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Bài 3: Kỹ thuật STAR nâng cao và xử lý các câu hỏi tình huống khó.</p>
                  </div>
                  <Link to="/coach" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"><Icon name="play_arrow" />Tiếp tục bài học</Link>
                </div>
                <div className="mt-5 flex items-center gap-3 text-[11px] text-slate-500"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/5 rounded-full bg-teal-700" /></div><span className="shrink-0 font-semibold">60%</span><span className="shrink-0">3 / 5 bài học</span></div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-bold tracking-tight text-slate-800">Tác vụ cần hoàn thành gấp <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">3</span></h2><button type="button" className="shrink-0 text-xs font-semibold text-teal-800 hover:underline">Xem tất cả bài tập</button></div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {tasks.map((task) => <article key={task.title} className="flex min-h-52 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${task.tone}`}><Icon name={task.icon} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${task.tagTone}`}>{task.tag}</span></div><h3 className="mt-3 text-sm font-bold leading-snug text-slate-800">{task.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{task.detail}</p><div className="mt-auto flex items-center justify-between pt-4 text-[11px]"><span className="font-semibold text-slate-500">{task.xp}</span><Link to="/coach" className="font-bold text-teal-800 hover:underline">{task.action} <span aria-hidden="true">›</span></Link></div></article>)}
                </div>
              </section>

              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon name="forum" /></span><div><h2 className="text-lg font-bold tracking-tight text-slate-800">Diễn đàn Tranh biện</h2><p className="text-xs text-slate-500">Học qua phản biện case thực tế, rèn tư duy logic và nhận phản hồi.</p></div></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#19345d] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm"><Icon name="edit_square" />Đặt tình huống</button></div>
                <div className="flex flex-col gap-4">
                  {discussionPosts.map((post, index) => <article key={post.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><InitialAvatar initials={post.initials} color={post.color} /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{post.author} <span className="font-normal text-slate-400">· {post.meta}</span></p><p className="mt-0.5 text-[11px] text-slate-400">{post.time} · Công khai</p></div></div><button type="button" aria-label="Tùy chọn bài viết" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><Icon name="more_horiz" /></button></div><h3 className="mt-4 text-base font-bold leading-snug text-slate-800">{post.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{post.body}</p>{index === 0 && <div className="mt-4 rounded-xl border border-slate-100 bg-[#fafaff] p-3"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-semibold text-slate-600">Phương án A: Làm ngay bản nháp, xác nhận sau</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[68%] rounded-full bg-teal-700" /></div></div><div><p className="text-xs font-semibold text-slate-600">Phương án B: Đặt lịch họp ngắn để rõ yêu cầu</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[32%] rounded-full bg-[#19345d]" /></div></div></div><p className="mt-2 text-[11px] text-slate-400">{post.votes}</p></div>}<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><button type="button" className="rounded-lg px-2.5 py-1.5 hover:bg-rose-50">❤️ Thích</button><button type="button" className="rounded-lg px-2.5 py-1.5 hover:bg-slate-50">▢ {post.comments} Luận điểm</button>{index === 0 && <Link to="/coach" className="ml-auto text-xs font-semibold text-teal-800 hover:underline">Xem phân tích Mentor ›</Link>}</div></article>)}
                </div>
              </section>
            </div>

            <aside className="flex min-w-0 flex-col gap-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="emoji_events" className="text-amber-500" />Vinh danh tuần</h2><span className="text-[10px] font-bold uppercase tracking-wide text-teal-800">Tuần 1</span></div>
                <div className="flex flex-col gap-1.5">{leaderboard.map((person, index) => <div key={person.name} className="flex items-center gap-2.5 rounded-xl px-2 py-2"><span className="w-4 text-xs font-bold text-slate-400">{index + 1}</span><InitialAvatar initials={person.initials} color={person.color} size="h-9 w-9" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{person.name} <span className="font-normal text-slate-400">#{index + 1}</span></p><p className="truncate text-[10px] text-slate-400">{person.school}</p></div><div className="text-right"><p className="text-xs font-bold text-amber-600">{person.xp} XP</p><p className="text-[10px] text-slate-400">Top {index + 1}%</p></div></div>)}</div>
                <div className="mt-2 rounded-lg bg-[#f1efff] px-3 py-2 text-xs text-slate-600">Vị trí của bạn: <strong className="text-teal-800">Hạng #5 (390 XP)</strong></div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2"><Icon name="local_fire_department" className="text-amber-500" /><h2 className="font-bold text-slate-800">Chuỗi 7 Ngày Streak</h2></div><p className="mt-1 text-xs text-slate-500">Duy trì thêm 3 ngày để nhận huy hiệu “Chiến binh kỷ luật 10D”.</p>
                <div className="mt-4 grid grid-cols-7 gap-1.5">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <div key={day} className="flex flex-col items-center gap-1"><span className="text-[9px] text-slate-400">{day}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-white"><Icon name="check" className="text-[15px]" /></span></div>)}</div>
                <div className="mt-4 flex justify-between text-[10px] text-slate-500"><span>Mục tiêu học hôm nay</span><strong className="text-teal-800">15 / 20 phút</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-teal-700" /></div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="auto_awesome" />Lượt AI Chấm Tuần Này</h2><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">PRO</span></div><div className="mt-4 flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-teal-100 border-t-teal-700 text-sm font-bold text-slate-800">3/5</div><div><p className="text-sm font-semibold text-slate-700">Đã dùng 3/5 lượt</p><p className="text-[11px] text-slate-400">Hạn lượt làm mới vào 00:00 Thứ 2</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" className="rounded-lg bg-slate-50 px-2 py-2 text-[10px] font-semibold text-slate-600">+ Nạp thêm lượt</button><button type="button" className="rounded-lg bg-[#19345d] px-2 py-2 text-[10px] font-semibold text-white">Nâng cấp CLB</button></div>
              </section>

              <Link to="/coach" className="flex items-center justify-between rounded-2xl border border-sky-100 bg-gradient-to-r from-white to-sky-100 p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700"><Icon name="work" /></span><div><p className="text-sm font-bold text-slate-800">Thư viện CV &amp; Câu hỏi mẫu</p><p className="text-[10px] text-slate-500">Hơn 120+ mẫu câu hỏi thực chiến</p></div></div><Icon name="chevron_right" className="text-slate-500" /></Link>

              <section id="weekly-goals" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="checklist" />Mục Tiêu Tuần</h2><span className="text-[10px] font-bold text-teal-800">2/3 Hoàn thành</span></div><div className="mt-3 flex flex-col gap-3 text-xs"><p className="flex items-center gap-2 text-slate-600"><Icon name="check_circle" className="text-teal-700" />Luyện 1 bài phản xạ STAR (1/1) <span className="ml-auto text-teal-700">Đạt</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Thử thách phản biện 1:1 <span className="ml-auto">Đang làm</span></p><p className="flex items-center gap-2 text-slate-500"><Icon name="radio_button_unchecked" />Đạt 500 XP tuần <span className="ml-auto">390 / 500 XP</span></p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-teal-700" /></div>
              </section>

              <section id="account" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Icon name="support_agent" />Mentor Phụ Trách</h2><span className="h-2 w-2 rounded-full bg-teal-500" /></div><div className="flex items-center gap-3 rounded-xl bg-[#f6f7fc] p-3"><InitialAvatar initials="VA" color="bg-amber-100 text-amber-800" /><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">Trần Việt Anh</p><p className="truncate text-[10px] text-slate-500">Senior HRBP · Mentor Lộ trình</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><Link to="/coach" className="rounded-lg bg-slate-50 py-2 text-center text-[10px] font-semibold text-slate-600">Hỏi 1:1</Link><Link to="/coach" className="rounded-lg bg-teal-100 py-2 text-center text-[10px] font-semibold text-teal-800">Nhóm CLB</Link></div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};
