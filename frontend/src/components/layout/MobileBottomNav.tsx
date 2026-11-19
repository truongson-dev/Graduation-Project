import { Link, useLocation } from 'react-router';
import { Home, Route as RouteIcon, Mic, Trophy, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileBottomNavProps {
  active?: string;
}

const navTabs = [
  { label: 'Trang chủ', to: '/home', icon: Home },
  { label: 'Lộ trình', to: '/learning-path', icon: RouteIcon },
  { label: 'Luyện AI', to: '/practice/setup', icon: Mic, highlight: true },
  { label: 'Thành tích', to: '/achievements', icon: Trophy },
  { label: 'Cộng đồng', to: '/community', icon: Users },
];

export function MobileBottomNav({ active }: MobileBottomNavProps) {
  const isMobile = useIsMobile(1024);
  const location = useLocation();
  const currentPath = active || location.pathname;

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      aria-label="Thanh điều hướng dưới"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={`Chuyển đến ${tab.label}`}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex flex-1 flex-col items-center justify-center py-1 
                min-h-[48px] min-w-[48px] touch-manipulation select-none
                transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-xl
                ${isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-800'}
              `}
            >
              {tab.highlight ? (
                <div
                  className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition-transform group-active:scale-90 ${
                    isActive
                      ? 'bg-blue-700 shadow-blue-700/35 ring-blue-50'
                      : 'bg-blue-600 shadow-blue-600/30'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <Icon className="h-5 w-5 transition-colors" />
                  {isActive && (
                    <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-blue-700" />
                  )}
                </div>
              )}
              <span
                className={`mt-1 text-[11px] leading-none tracking-tight ${
                  tab.highlight ? 'font-bold text-blue-700' : ''
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
