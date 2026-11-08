import { useState, useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLogout, useMe } from '@/lib/auth';
import { useSidebarCollapsed } from '@/hooks/use-sidebar';
import { BrandMark } from './BrandMark';
import { UserAvatar } from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '../ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react';

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

function UserDropdownMenuContent({
  user,
  initials,
  onLogout,
  isLoggingOut,
  side = 'bottom',
  align = 'end',
  sideOffset = 14,
  className,
}: {
  user?: { name?: string; email?: string; avatar_url?: string | null } | null;
  initials: string;
  onLogout: () => void;
  isLoggingOut?: boolean;
  side?: 'bottom' | 'top' | 'right' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}) {
  return (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={className ?? 'w-64 rounded-2xl p-1.5 shadow-xl border border-slate-200 bg-white'}
    >
      <div className="flex items-center gap-2.5 p-2 text-left">
        <UserAvatar
          avatarUrl={user?.avatar_url}
          name={user?.name}
          initials={initials}
          size="h-9 w-9 shrink-0"
          color="bg-blue-100 text-blue-800 shadow-xs"
        />
        <div className="grid flex-1 text-left text-xs leading-tight min-w-0">
          <span className="truncate font-bold text-slate-800">{user?.name ?? 'Học viên'}</span>
          <span className="truncate text-[11px] text-slate-400 font-normal">{user?.email ?? 'hocvien@example.com'}</span>
        </div>
      </div>

      <DropdownMenuSeparator className="my-1 -mx-1" />

      <DropdownMenuGroup>
        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <Sparkles className="size-4 text-amber-500" />
          <span>Nâng cấp Pro</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="my-1 -mx-1" />

      <DropdownMenuGroup>
        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <BadgeCheck className="size-4 text-slate-500" />
          <span>Tài khoản</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <CreditCard className="size-4 text-slate-500" />
          <span>Gói học & Thanh toán</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <Bell className="size-4 text-slate-500" />
          <span>Thông báo</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="my-1 -mx-1" />

      <DropdownMenuItem
        variant="destructive"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700 transition-colors"
      >
        <LogOut className="size-4" />
        <span>Đăng xuất</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function StudentPageLayout({
  active,
  title,
  children,
  maxWidth = 'max-w-[1720px]',
}: {
  active: string;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = useMe().data;
  const logout = useLogout();
  const logoutNow = () => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) });
  const initials = (user?.name ?? 'HV').split(/\s+/).map((part) => part[0]).slice(-2).join('').toUpperCase();

  // Đóng sidebar di động ngay lập tức khi người dùng chuyển sang màn hình desktop (>= 1024px)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setMobileOpen(false);
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const nav = (mobile = false) => (
    <nav aria-label="Điều hướng chính" className="flex flex-col gap-1.5">
      {items.map((item) => {
        const link = (
          <Link
            to={item.to}
            onClick={() => mobile && setMobileOpen(false)}
            aria-current={active === item.to ? 'page' : undefined}
            className={`group relative flex h-10 w-full items-center rounded-xl font-semibold transition-colors duration-200 overflow-hidden ${
              active === item.to
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name={item.icon} className="text-[20px]" />
            </div>
            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out text-[13px] select-none ${
                collapsed && !mobile
                  ? 'max-w-0 opacity-0 -translate-x-2'
                  : 'max-w-[180px] opacity-100 translate-x-0'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );

        return (
          <div key={item.to} className="relative flex w-full items-center">
            <Tooltip disabled={!collapsed || mobile}>
              <TooltipTrigger render={link} />
              <TooltipContent side="right" sideOffset={14}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f1f4fa] text-slate-800">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white px-[18px] transition-[width] duration-300 ease-in-out overflow-hidden will-change-[width] lg:flex ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        <div className="relative -mx-[18px] mb-4 flex h-[68px] shrink-0 items-center border-b border-slate-200/80 px-[18px] overflow-hidden">
          <div className="relative group flex h-10 w-full items-center min-w-0">
            <Link
              to="/home"
              aria-label="SoftSkill AI - Trang chủ"
              className="relative flex h-10 w-full items-center rounded-xl overflow-hidden text-[#163762]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <BrandMark className="h-8 w-8 shrink-0" />
              </div>
              <span
                className={`text-[16px] font-extrabold tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out select-none ${
                  collapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[150px] opacity-100 translate-x-0'
                }`}
              >
                SoftSkill <span className="text-blue-600">AI</span>
              </span>
            </Link>

            {/* Nút mở rộng thanh bên (chỉ hiển thị khi đã thu gọn và hover vào logo) */}
            <Tooltip disabled={!collapsed}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Mở rộng thanh bên"
                    tabIndex={collapsed ? 0 : -1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      toggleCollapsed();
                    }}
                    className={`absolute left-0 top-0 h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 backdrop-blur-xs transition-opacity duration-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 ${
                      collapsed
                        ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto'
                        : 'pointer-events-none opacity-0'
                    }`}
                  >
                    <Icon name="left_panel_open" className="text-[18px]" />
                  </button>
                }
              />
              <TooltipContent side="right" sideOffset={14}>
                Mở rộng thanh bên
              </TooltipContent>
            </Tooltip>

            {/* Nút thu gọn thanh bên (nằm tuyệt đối ở mép phải khi mở rộng, không chèn ép flex layout) */}
            <div
              className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out ${
                collapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
              }`}
            >
              <Tooltip disabled={collapsed}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Thu gọn thanh bên"
                      tabIndex={collapsed ? -1 : 0}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        toggleCollapsed();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-blue-700 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                    >
                      <Icon name="left_panel_close" className="text-[18px]" />
                    </button>
                  }
                />
                <TooltipContent side="bottom" sideOffset={6}>
                  Thu gọn thanh bên
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
          {nav()}
        </div>

        <div className="mt-auto -mx-[18px] border-t border-slate-200/80 px-[18px] py-2.5 overflow-hidden">
          <DropdownMenu modal={false}>
            <Tooltip disabled={!collapsed}>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    aria-label="Menu tài khoản"
                    className="group relative flex h-11 w-full items-center rounded-xl overflow-hidden text-left transition-colors hover:bg-slate-100 active:bg-slate-200/80 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  >
                    <div className="flex h-11 w-10 shrink-0 items-center justify-center">
                      <UserAvatar
                        avatarUrl={user?.avatar_url}
                        name={user?.name}
                        initials={initials}
                        size="h-8 w-8 shrink-0"
                        color="bg-blue-100 text-blue-800 shadow-xs"
                      />
                    </div>
                    <div
                      className={`grid flex-1 text-left text-xs leading-tight min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
                        collapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[150px] opacity-100 translate-x-0 pl-2'
                      }`}
                    >
                      <span className="truncate font-bold text-slate-800">{user?.name ?? 'Học viên'}</span>
                      <span className="truncate text-[11px] text-slate-400 font-normal">{user?.email ?? 'hocvien@example.com'}</span>
                    </div>
                    <div
                      className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 ease-in-out ${
                        collapsed ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
                      }`}
                    >
                      <ChevronsUpDown className="size-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent side="right" sideOffset={14}>
                {user?.name ?? 'Học viên'}
              </TooltipContent>
            </Tooltip>

            <UserDropdownMenuContent
              user={user}
              initials={initials}
              onLogout={logoutNow}
              isLoggingOut={logout.isPending}
              side="right"
              align="end"
              sideOffset={14}
            />
          </DropdownMenu>
        </div>
      </aside>

      <div className={`transition-[padding-left] duration-300 ease-in-out ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header
          className={`fixed inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl transition-[left] duration-300 ease-in-out sm:px-6 ${
            collapsed ? 'lg:left-[76px]' : 'lg:left-[260px]'
          } lg:px-8`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="Mở điều hướng"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#163762] hover:bg-blue-50 touch-manipulation cursor-pointer lg:hidden"
            >
              <Icon name="menu" className="text-[22px]" />
            </button>
            <label className="relative hidden w-full max-w-2xl sm:block">
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-slate-400" />
              <input
                aria-label="Tìm kiếm"
                placeholder="Tìm kỹ năng, lộ trình học, bài tập thực hành..."
                className="h-10 w-full rounded-xl border border-slate-100 bg-[#f5f7fc] pl-10 pr-4 text-sm outline-none transition focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </label>
            <Link to="/home" className="flex items-center gap-2 text-[#163762] sm:hidden">
              <BrandMark className="h-9 w-9" />
              <span className="font-bold">SoftSkill AI</span>
            </Link>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label="Thông báo"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 touch-manipulation"
            >
              <Icon name="notifications" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="hidden h-8 border-l border-slate-200 sm:block" />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label="Menu tài khoản"
                className="group flex items-center gap-2 rounded-xl p-1 sm:p-1.5 transition-colors hover:bg-slate-100 active:bg-slate-200/80 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 touch-manipulation"
              >
                <UserAvatar
                  avatarUrl={user?.avatar_url}
                  name={user?.name}
                  initials={initials}
                  color="bg-blue-100 text-blue-800 shadow-xs"
                  size="h-8 w-8 shrink-0"
                />
                <span className="hidden max-w-36 truncate text-xs font-bold text-slate-800 md:block">
                  {user?.name ?? 'Học viên'}
                </span>
                <ChevronsUpDown className="size-3.5 text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:block shrink-0" />
              </DropdownMenuTrigger>

              <UserDropdownMenuContent
                user={user}
                initials={initials}
                onLogout={logoutNow}
                isLoggingOut={logout.isPending}
                side="bottom"
                align="end"
                sideOffset={8}
              />
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Navigation Sidebar Drawer (Trượt từ bên trái) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[290px] sm:w-[320px] p-0 gap-0 bg-white border-r border-slate-200/90 shadow-2xl flex flex-col lg:hidden"
          >
            <SheetHeader className="h-[68px] flex-row items-center justify-between border-b border-slate-200/80 px-4 py-0 shrink-0">
              <Link
                to="/home"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 text-[#163762]"
              >
                <BrandMark className="h-8 w-8 shrink-0" />
                <span className="text-[16px] font-extrabold tracking-tight">
                  SoftSkill <span className="text-blue-600">AI</span>
                </span>
              </Link>
              <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
              <SheetDescription className="sr-only">Danh mục điều hướng chính trên di động</SheetDescription>
              <SheetClose
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all duration-300 hover:bg-slate-200 hover:text-blue-700 touch-manipulation cursor-pointer"
                aria-label="Thu gọn thanh bên"
                title="Thu gọn thanh bên"
              >
                <Icon name="left_panel_close" className="text-[18px]" />
              </SheetClose>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {nav(true)}
            </div>

            <div className="mt-auto border-t border-slate-200/80 p-3 shrink-0">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger
                  aria-label="Menu tài khoản"
                  className="group flex h-11 w-full items-center rounded-xl overflow-hidden text-left transition-colors hover:bg-slate-100 active:bg-slate-200/80 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 px-1"
                >
                  <div className="flex h-11 w-10 shrink-0 items-center justify-center">
                    <UserAvatar
                      avatarUrl={user?.avatar_url}
                      name={user?.name}
                      initials={initials}
                      size="h-8 w-8 shrink-0"
                      color="bg-blue-100 text-blue-800 shadow-xs"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-xs leading-tight min-w-0 pl-2">
                    <span className="truncate font-bold text-slate-800">{user?.name ?? 'Học viên'}</span>
                    <span className="truncate text-[11px] text-slate-400 font-normal">{user?.email ?? 'hocvien@example.com'}</span>
                  </div>
                  <ChevronsUpDown className="size-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-auto mr-1" />
                </DropdownMenuTrigger>

                <UserDropdownMenuContent
                  user={user}
                  initials={initials}
                  onLogout={() => {
                    setMobileOpen(false);
                    logoutNow();
                  }}
                  isLoggingOut={logout.isPending}
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="w-[266px] sm:w-[296px] rounded-2xl p-1.5 shadow-xl border border-slate-200 bg-white z-[60]"
                />
              </DropdownMenu>
            </div>
          </SheetContent>
        </Sheet>

        <main className={`mx-auto ${maxWidth} px-4 pb-10 pt-[84px] sm:px-6 lg:px-8`}>{children}</main>
      </div>
    </div>
  );
}
