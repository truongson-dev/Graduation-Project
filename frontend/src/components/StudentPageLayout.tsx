import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogout, useMe } from '../lib/auth';
import { useSidebarCollapsed } from '../lib/sidebar';
import { BrandMark } from './BrandMark';
import { UserAvatar } from './Common/UserAvatar';

const items = [
  { label: 'Trang chủ', icon: 'home', to: '/home' },
  { label: 'Lộ trình học', icon: 'route', to: '/learning-path' },
  { label: 'Luyện thuyết trình với AI', icon: 'record_voice_over', to: '/practice/setup' },
  { label: 'Thành tích', icon: 'emoji_events', to: '/achievements' },
  { label: 'Cộng đồng', icon: 'forum', to: '/community' },
];

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function StudentPageLayout({ active, children }: { active: string; title: string; children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = useMe().data;
  const logout = useLogout();
  const logoutNow = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });

  const nav = (mobile = false) => (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
      {items.map((item) => <div key={item.to} className={`relative flex w-full items-center ${collapsed && !mobile ? '' : 'gap-1'}`}>
        <Link to={item.to} onClick={() => mobile && setMobileOpen(false)} title={collapsed && !mobile ? item.label : undefined} aria-current={active === item.to ? 'page' : undefined}
          className={`flex min-w-0 flex-1 items-center rounded-xl py-2.5 text-[13px] font-semibold transition ${collapsed && !mobile ? 'relative left-[-2px] justify-center px-0' : 'gap-3 px-3'} ${active === item.to ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
          <Icon name={item.icon} className="shrink-0 text-[19px]" />{(!collapsed || mobile) && <span>{item.label}</span>}
        </Link>
      </div>)}
    </nav>
  );

  return <div className="min-h-screen bg-[#f1f4fa] text-slate-800">
    <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white px-3 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[76px]' : 'w-[260px]'}`}>
      <div className={`relative -mx-3 flex h-[68px] shrink-0 items-center border-b border-slate-200/80 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? <div className="group relative h-7 w-7"><Link to="/home" aria-label="SoftSkill AI - Trang chủ" className="block h-full w-full"><BrandMark className="h-7 w-7" /></Link><button type="button" aria-label="Mở rộng thanh bên" title="Mở thanh bên" onClick={toggleCollapsed} className="absolute -inset-0.5 hidden items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-blue-700 group-hover:flex group-focus-within:flex"><Icon name="left_panel_open" className="text-[18px]" /></button></div> : <><Link to="/home" aria-label="SoftSkill AI - Trang chủ" className="flex min-w-0 items-center gap-2.5 text-[#163762]"><BrandMark className="h-9 w-9 shrink-0" /><span className="text-[16px] font-extrabold tracking-tight">SoftSkill <span className="text-blue-600">AI</span></span></Link><button type="button" aria-label="Thu gọn thanh bên" title="Thu gọn thanh bên" onClick={toggleCollapsed} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-blue-700"><Icon name="left_panel_close" className="text-[18px]" /></button></>}
      </div>
      <div className="pt-4">{nav()}</div>
      <div className={`mt-auto border-t border-slate-100 pt-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-2.5 px-1 pb-3 ${collapsed ? 'justify-center' : ''}`}>
          <UserAvatar avatarUrl={user?.avatar_url} name={user?.name} size="h-8 w-8" color="bg-blue-100 text-blue-800" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{user?.name ?? 'Học viên'}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email ?? ''}</p>
            </div>
          )}
        </div>
        <button type="button" onClick={logoutNow} disabled={logout.isPending} title={collapsed ? 'Đăng xuất' : undefined} className={`flex items-center rounded-xl py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 ${collapsed ? 'h-9 w-9 justify-center px-0' : 'w-full gap-3 px-3'}`}><Icon name="logout" />{!collapsed && 'Đăng xuất'}</button>
      </div>
    </aside>
    <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
      <button type="button" aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)} className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#163762] shadow-sm hover:bg-blue-50 lg:hidden"><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-100 bg-white p-4 shadow-lg lg:hidden">
          <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
            <UserAvatar avatarUrl={user?.avatar_url} name={user?.name} size="h-9 w-9" color="bg-blue-100 text-blue-800" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{user?.name ?? 'Học viên'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email ?? ''}</p>
            </div>
          </div>
          {nav(true)}
          <button type="button" onClick={logoutNow} className="mt-3 flex w-full items-center gap-3 border-t border-slate-100 px-3 pt-4 text-sm font-semibold text-slate-500"><Icon name="logout" />Đăng xuất</button>
        </div>
      )}
      <main className="mx-auto max-w-[1420px] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-6">{children}</main>
    </div>
  </div>;
}
