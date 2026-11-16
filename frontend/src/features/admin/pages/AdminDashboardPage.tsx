import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLogout, useMe } from '@/lib/auth';
import { useAdminDashboard } from '../api/admin';
import { BrandMark } from '@/components/layout/BrandMark';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Presentation,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';

const navItems = [
  { label: 'Tổng quan', icon: LayoutDashboard, to: '/admin' },
  { label: 'Sinh viên', icon: Users, to: '/admin/users' },
  { label: 'Bài tập luyện tập', icon: ClipboardList, to: '/admin/lessons' },
  { label: 'Kỹ năng & Rubric', icon: BookOpen, to: '/admin/learning-paths' },
  { label: 'Phiên thuyết trình AI', icon: Presentation, to: '/admin/presentations' },
  { label: 'Điểm & báo cáo', icon: BarChart3, to: '/admin/ai-results' },
  { label: 'Cộng đồng', icon: MessageSquare, to: '/admin/feedback' },
  { label: 'Thành tích', icon: TrendingUp, to: '/admin/notifications' },
  { label: 'Nhật ký hoạt động', icon: Activity, to: '/admin/audit-logs' },
  { label: 'Cấu hình AI', icon: Settings, to: '/admin/settings' },
];

const stats = [
  { label: 'Tổng sinh viên', icon: Users, tone: 'blue' },
  { label: 'Bài tập đang hoạt động', icon: ClipboardList, tone: 'green' },
  { label: 'Lượt luyện tập', icon: Activity, tone: 'purple' },
  { label: 'Điểm trung bình', icon: TrendingUp, tone: 'orange' },
  { label: 'Bài đăng cần duyệt', icon: MessageSquare, tone: 'rose' },
];

const recentSessions = [
  ['Nguyễn Minh Anh', 'Pitch dự án cá nhân', '86/100', 'Hoàn thành', '2 phút trước'],
  ['Trần Quốc Bảo', 'Giao tiếp tự tin', '74/100', 'Hoàn thành', '18 phút trước'],
  ['Lê Hoàng Nam', 'Thuyết trình với AI', '—', 'Đang xử lý', '32 phút trước'],
  ['Phạm Thu Trang', 'Phỏng vấn chuyên nghiệp', '91/100', 'Hoàn thành', '1 giờ trước'],
];

const activity = [
  ['Nguyễn Minh Anh', 'hoàn thành một phiên thuyết trình', '2 phút trước', 'bg-emerald-100 text-emerald-700'],
  ['Quản trị viên', 'cập nhật lộ trình “Giao tiếp tự tin”', '15 phút trước', 'bg-blue-100 text-blue-700'],
  ['Trần Quốc Bảo', 'gửi phản hồi mới', '28 phút trước', 'bg-amber-100 text-amber-700'],
];

function toneClasses(tone: string) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-violet-50 text-violet-700', orange: 'bg-orange-50 text-orange-700', rose: 'bg-rose-50 text-rose-700',
  };
  return tones[tone] ?? tones.blue;
}

export function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = useMe().data;
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = useAdminDashboard();
  const adminName = user?.name ?? 'Quản trị viên';
  const liveStats = dashboard.data ? [
    dashboard.data.users.total.toLocaleString('vi-VN'),
    dashboard.data.exercises?.active?.toLocaleString('vi-VN') ?? '—',
    dashboard.data.activity?.reduce((sum, point) => sum + point.active_users, 0).toLocaleString('vi-VN') ?? '—',
    dashboard.data.ai.average_score.toLocaleString('vi-VN'),
    dashboard.data.pending_feedback.toLocaleString('vi-VN'),
  ] : stats.map(() => '—');

  const logoutNow = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-800">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white text-[#19345d] shadow-sm transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : ''}`}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
          <BrandMark className="h-10 w-10 shrink-0" />
          {!collapsed && <div><p className="font-extrabold tracking-tight">SoftSkill AI</p><p className="text-[10px] uppercase tracking-[.18em] text-blue-500">Admin Console</p></div>}
          <button type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-blue-50 lg:hidden"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Điều hướng Admin">
          {navItems.map(({ label, icon: Icon, to }) => { const active = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to); return <Link key={to} to={to} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon className="size-[18px] shrink-0" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span></Link>; })}
        </nav>
        <div className="border-t border-slate-100 p-4"><button type="button" onClick={logoutNow} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"><LogOut className="size-[18px]" /><span className={collapsed ? 'lg:hidden' : ''}>Đăng xuất</span></button></div>
      </aside>

      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <button type="button" aria-label="Mở menu" onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="size-5" /></button>
          <button type="button" aria-label="Thu gọn sidebar" onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:block">{collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}</button>
          <h1 className="text-lg font-extrabold text-[#18345c] sm:text-xl">Dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <label className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 md:flex"><Search className="size-4" /><input aria-label="Tìm kiếm" placeholder="Tìm kiếm trong hệ thống..." className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></label>
            <button type="button" aria-label="Thông báo" className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Bell className="size-5" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /></button>
            <button type="button" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">{adminName.split(' ').map((part) => part[0]).slice(-2).join('').toUpperCase()}</span><span className="hidden text-left sm:block"><span className="block text-xs font-bold text-slate-800">{adminName}</span><span className="block text-[10px] text-slate-400">Quản trị viên</span></span><ChevronDown className="size-4 text-slate-400" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1680px] space-y-6 p-4 sm:p-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e63c6] to-[#3183e8] p-6 text-white shadow-lg sm:p-8"><div className="relative z-10"><p className="text-sm font-semibold text-blue-100">TỔNG QUAN HỆ THỐNG</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Chào mừng trở lại, {adminName}!</h2><p className="mt-2 max-w-xl text-sm text-blue-100">Theo dõi hoạt động học tập và chất lượng đánh giá AI của SoftSkill AI.</p></div><ShieldCheck className="absolute -right-3 -top-7 size-44 text-white/10" /></section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map(({ label, icon: Icon, tone }, index) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses(tone)}`}><Icon className="size-5" /></span>{dashboard.isPending && <span className="text-[10px] text-slate-400">Đang tải</span>}</div><p className="mt-4 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#18345c]">{liveStats[index]}</p></div>)}</section>

          <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-[#18345c]">Hoạt động người dùng</h2><p className="mt-1 text-xs text-slate-400">Số người dùng hoạt động trong 7 ngày gần nhất</p></div><select aria-label="Khoảng thời gian" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"><option>7 ngày qua</option><option>30 ngày qua</option></select></div><div className="mt-6 flex h-48 items-end gap-3 border-b border-l border-slate-200 px-3 pb-0 sm:gap-6">{(dashboard.data?.activity ?? []).map((point, index, points) => { const max = Math.max(...points.map((item) => item.active_users), 1); const height = (point.active_users / max) * 100; return <div key={point.date} className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-10 rounded-t-lg bg-blue-500 transition-all hover:bg-blue-700" style={{ height: `${Math.max(height, 3)}%` }} /><span className="text-[10px] text-slate-400">{point.date.slice(5)}</span></div>; })}</div>{dashboard.isError && <p className="mt-3 text-xs text-rose-600">Không tải được dữ liệu dashboard.</p>}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-extrabold text-[#18345c]">Điểm AI theo tiêu chí</h2><p className="mt-1 text-xs text-slate-400">Điểm trung bình của 30 ngày qua</p><div className="mt-6 space-y-4">{[['Tốc độ nói', 82, 'bg-blue-500'], ['Từ đệm', 71, 'bg-orange-400'], ['Giao tiếp mắt', 79, 'bg-emerald-500'], ['Tư thế', 86, 'bg-violet-500']].map(([label, score, color]) => <div key={label as string}><div className="mb-1 flex justify-between text-xs font-semibold"><span>{label}</span><span>{score}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} /></div></div>)}</div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-extrabold text-[#18345c]">Phiên thuyết trình gần đây</h2><p className="mt-1 text-xs text-slate-400">Các hoạt động mới nhất của học viên</p></div><Link to="/admin/presentations" className="text-xs font-bold text-blue-600 hover:underline">Xem tất cả</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Học viên</th><th className="px-5 py-3">Nội dung</th><th className="px-5 py-3">Điểm</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Thời gian</th></tr></thead><tbody className="divide-y divide-slate-100">{recentSessions.map((row) => <tr key={`${row[0]}-${row[1]}`} className="hover:bg-slate-50"><td className="px-5 py-3 font-bold text-slate-700">{row[0]}</td><td className="px-5 py-3 text-slate-500">{row[1]}</td><td className="px-5 py-3 font-extrabold text-[#18345c]">{row[2]}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row[3] === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row[3]}</span></td><td className="px-5 py-3 text-slate-400">{row[4]}</td></tr>)}</tbody></table></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-[#18345c]">Hoạt động gần đây</h2><p className="mt-1 text-xs text-slate-400">Nhật ký hệ thống</p></div><Link to="/admin/audit-logs" className="text-xs font-bold text-blue-600 hover:underline">Xem nhật ký</Link></div><div className="mt-5 space-y-5">{activity.map(([name, action, time, tone]) => <div key={`${name}-${time}`} className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}><Activity className="size-4" /></span><div><p className="text-xs leading-relaxed text-slate-600"><strong className="text-slate-800">{name}</strong> {action}</p><p className="mt-1 text-[10px] text-slate-400">{time}</p></div></div>)}</div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-[#18345c]">Sinh viên tiến bộ tốt nhất</h2><p className="mt-1 text-xs text-slate-400">Theo điểm tăng trong 30 ngày</p></div><TrendingUp className="size-5 text-emerald-500" /></div><div className="mt-5 space-y-4">{[['Nguyễn Minh Anh','+18 điểm','92'],['Phạm Thu Trang','+15 điểm','91'],['Trần Quốc Bảo','+12 điểm','84']].map(([name,growth,score], index) => <div key={name} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-700">{name}</p><p className="text-[10px] text-emerald-600">{growth}</p></div><span className="text-sm font-black text-[#18345c]">{score}</span></div>)}</div></div><Link to="/admin/ai-results" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-[#18345c]">Báo cáo & tiến bộ</h2><p className="mt-1 text-xs text-slate-400">Theo dõi hiệu quả luyện tập</p></div><BarChart3 className="size-5 text-blue-600" /></div><p className="mt-7 text-3xl font-black text-[#18345c]">+24.8%</p><p className="mt-1 text-xs text-emerald-600">Tăng trưởng điểm trung bình</p><div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-2 w-3/4 rounded-full bg-blue-500" /></div></Link><Link to="/admin/feedback" className="rounded-2xl border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md"><AlertTriangle className="size-6 text-orange-600" /><h3 className="mt-3 font-extrabold text-[#18345c]">Kiểm duyệt cộng đồng</h3><p className="mt-1 text-xs text-slate-500">12 bài đăng và bình luận đang chờ xử lý.</p><span className="mt-5 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-orange-700">Mở hàng đợi →</span></Link></section>
          <footer className="border-t border-slate-200 pt-5 text-center text-[11px] text-slate-400">SoftSkill AI Admin Console · Quản trị nội dung và hoạt động học tập</footer>
        </main>
      </div>
    </div>
  );
}
