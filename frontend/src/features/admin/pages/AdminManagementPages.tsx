import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLogout, useMe } from '@/features/auth/api/auth';
import { useAdminLearningPaths, useAdminUsers, useUpdateAdminLearningPath, type AdminLearningPath } from '../api/admin';
import { BrandMark } from '@/components/layout/BrandMark';
import {
  Activity, Bell, BookOpen, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, MessageSquare,
  Presentation, Search, Settings, ShieldCheck, Users, X, Plus, SlidersHorizontal, MoreHorizontal, TrendingUp,
} from 'lucide-react';

const navItems = [
  { label: 'Tổng quan', icon: LayoutDashboard, to: '/admin' },
  { label: 'Sinh viên', icon: Users, to: '/admin/users' },
  { label: 'Bài tập luyện tập', icon: FileText, to: '/admin/lessons' },
  { label: 'Kỹ năng & Rubric', icon: BookOpen, to: '/admin/learning-paths' },
  { label: 'Phiên thuyết trình AI', icon: Presentation, to: '/admin/presentations' },
  { label: 'Điểm & báo cáo', icon: Activity, to: '/admin/ai-results' },
  { label: 'Cộng đồng', icon: MessageSquare, to: '/admin/feedback' },
  { label: 'Thành tích', icon: TrendingUp, to: '/admin/notifications' },
  { label: 'Nhật ký hoạt động', icon: ShieldCheck, to: '/admin/audit-logs' },
  { label: 'Cài đặt', icon: Settings, to: '/admin/settings' },
];

function AdminShell({ children, title, description, action }: { children: ReactNode; title: string; description: string; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const user = useMe().data;
  const logout = useLogout();
  const navigate = useNavigate();
  const name = user?.name ?? 'Quản trị viên';
  const logoutNow = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  return <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white text-[#19345d] shadow-sm transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : ''}`}>
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5"><BrandMark className="h-10 w-10 shrink-0" />{!collapsed && <div><p className="font-extrabold tracking-tight">SoftSkill AI</p><p className="text-[10px] uppercase tracking-[.18em] text-blue-500">Admin Console</p></div>}<button type="button" aria-label="Đóng menu" onClick={() => setOpen(false)} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-blue-50 lg:hidden"><X className="size-5" /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Điều hướng Admin">{navItems.map(({ label, icon: Icon, to }) => { const active = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to); return <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}><Icon className="size-[18px] shrink-0" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span></Link>; })}</nav>
      <div className="border-t border-slate-100 p-4"><button type="button" onClick={logoutNow} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"><LogOut className="size-[18px]" /><span className={collapsed ? 'lg:hidden' : ''}>Đăng xuất</span></button></div>
    </aside>
    <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8"><button type="button" aria-label="Mở menu" onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="size-5" /></button><button type="button" aria-label="Thu gọn sidebar" onClick={() => setCollapsed((v) => !v)} className="hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:block"><Menu className="size-5" /></button><h1 className="text-lg font-extrabold text-[#18345c] sm:text-xl">{title}</h1><div className="ml-auto flex items-center gap-3"><label className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 md:flex"><Search className="size-4" /><input aria-label="Tìm kiếm" placeholder="Tìm kiếm trong hệ thống..." className="w-full bg-transparent text-xs outline-none" /></label><button type="button" aria-label="Thông báo" className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Bell className="size-5" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">{name.split(' ').map((p: string) => p[0]).slice(-2).join('').toUpperCase()}</span><span className="hidden text-left sm:block"><span className="block text-xs font-bold">{name}</span><span className="block text-[10px] text-slate-400">Quản trị viên</span></span><ChevronDown className="size-4 text-slate-400" /></div></div></header>
      <main className="mx-auto max-w-[1680px] space-y-6 p-4 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-indigo-600">ADMIN CONSOLE</p><h2 className="mt-1 text-2xl font-black text-[#18345c]">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div>{children}</main>
    </div>
  </div>;
}

function Toolbar({ placeholder = 'Tìm kiếm...', value, onChange, action }: { placeholder?: string; value?: string; onChange?: (value: string) => void; action?: ReactNode }) { return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400"><Search className="size-4" /><input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className="w-full bg-transparent text-xs outline-none" /></label><button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><SlidersHorizontal className="size-4" /> Bộ lọc</button>{action}</div>; }

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const users = useAdminUsers({ search });
  return <AdminShell title="Quản lý người dùng" description="Quản lý tài khoản, vai trò và trạng thái truy cập của học viên." action={<button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" /> Thêm người dùng</button>}><Toolbar placeholder="Tìm theo tên hoặc email..." value={search} onChange={setSearch} action={<select aria-label="Lọc trạng thái" className="h-10 rounded-xl border border-slate-200 px-3 text-xs"><option>Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="suspended">Đã khóa</option></select>} /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Người dùng</th><th className="px-5 py-3">Vai trò</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Ngày tham gia</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{users.data?.data.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.email}</p></td><td className="px-5 py-4"><div className="flex gap-1">{item.roles.map((role) => <span key={role} className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{role}</span>)}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{item.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td className="px-5 py-4 text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '—'}</td><td className="px-5 py-4 text-right"><button type="button" aria-label={`Thao tác ${item.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="size-4" /></button></td></tr>)}{!users.isPending && !users.data?.data.length && <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400">Chưa có người dùng phù hợp.</td></tr>}{users.isPending && <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400">Đang tải dữ liệu...</td></tr>}</tbody></table></div></div></AdminShell>;
}

function EmptyManagementPage({ title, description, icon: Icon, actionLabel }: { title: string; description: string; icon: typeof BookOpen; actionLabel: string }) { return <AdminShell title={title} description={description} action={<button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" /> {actionLabel}</button>}><Toolbar /><div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="size-7" /></span><h3 className="mt-4 font-extrabold text-[#18345c]">Chưa có dữ liệu để hiển thị</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Hãy tạo dữ liệu đầu tiên hoặc kết nối API quản trị để bắt đầu quản lý {title.toLowerCase()}.</p><button type="button" className="mt-5 rounded-xl border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Tìm hiểu quy trình</button></div></AdminShell>; }

export function AdminLearningPathsPage() {
  const query = useAdminLearningPaths();
  const update = useUpdateAdminLearningPath();
  const path = query.data?.[0];
  const [lessons, setLessons] = useState<AdminLearningPath['lessons']>([]);
  useEffect(() => { if (path) setLessons(path.lessons); }, [path]);
  return <AdminShell title="Lộ trình học" description="Thêm, xóa và sắp xếp bài luyện tập. Nội dung lưu trực tiếp vào database." action={<button type="button" onClick={() => setLessons((items) => [...items, { title: 'Bài luyện tập mới', sort_order: items.length + 1 }])} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" /> Thêm bài</button>}>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-extrabold text-[#18345c]">{path?.title ?? 'Lộ trình'}</h3><p className="mt-1 text-xs text-slate-500">{lessons.length} bài đang được hiển thị cho học viên.</p></div><button type="button" disabled={!path || update.isPending || lessons.length === 0} onClick={() => path && update.mutate({ id: path.id, lessons })} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300">{update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div><div className="space-y-3">{lessons.map((lesson, index) => <div key={`${lesson.sort_order}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="w-6 text-center text-xs font-bold text-slate-400">{index + 1}</span><input value={lesson.title} onChange={(event) => setLessons((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value, sort_order: index + 1 } : item))} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500" /><button type="button" aria-label={`Xóa ${lesson.title}`} onClick={() => setLessons((items) => items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })))} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Xóa</button></div>)}{!lessons.length && <p className="py-12 text-center text-sm text-slate-400">Chưa có bài luyện tập.</p>}</div></div>
  </AdminShell>;
}
export const AdminLessonsPage = () => <EmptyManagementPage title="Bài học" description="Quản lý bài lý thuyết, trắc nghiệm và bài viết AI chấm điểm." icon={FileText} actionLabel="Tạo bài học" />;
export const AdminPresentationsPage = () => <EmptyManagementPage title="Phiên thuyết trình" description="Tra cứu phiên luyện tập, transcript, audio và kết quả đánh giá." icon={Presentation} actionLabel="Xuất báo cáo" />;
export const AdminAiResultsPage = () => <EmptyManagementPage title="Kết quả AI" description="Theo dõi điểm số và xu hướng cải thiện theo từng tiêu chí." icon={Activity} actionLabel="Tải báo cáo" />;
export const AdminFeedbackPage = () => <EmptyManagementPage title="Phản hồi" description="Tiếp nhận, phân loại và xử lý phản hồi từ người dùng." icon={MessageSquare} actionLabel="Tạo phản hồi" />;
export const AdminNotificationsPage = () => <EmptyManagementPage title="Thông báo" description="Tạo và gửi thông báo đến các nhóm người dùng." icon={Bell} actionLabel="Tạo thông báo" />;
export const AdminAuditLogsPage = () => <EmptyManagementPage title="Nhật ký hoạt động" description="Theo dõi các thao tác quản trị và thay đổi dữ liệu quan trọng." icon={ShieldCheck} actionLabel="Xuất nhật ký" />;
export const AdminSettingsPage = () => <EmptyManagementPage title="Cài đặt" description="Cấu hình hệ thống, giới hạn tệp và trạng thái dịch vụ AI." icon={Settings} actionLabel="Lưu cấu hình" />;
