import React from 'react';
import { AppIcon } from './AppIcon';

interface HeaderProps {
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp }) => {
  return (
    <header className="w-full px-6 lg:px-12 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#002045] flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105">
          <AppIcon name="school" className="text-[24px]" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-[#002045] leading-none">
            SkillBridge
          </span>
          <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1">
            Học thật • Làm thật • Vươn xa
          </span>
        </div>
      </div>

      {/* Help Link & Support Button */}
      <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
        <span className="hidden sm:inline">Cần hỗ trợ?</span>
        <button
          type="button"
          onClick={onOpenHelp}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition cursor-pointer active:scale-95"
        >
          <AppIcon name="help_outline" className="text-[18px] text-slate-500" />
          <span className="font-medium text-sm">Trung tâm trợ giúp</span>
        </button>
      </div>
    </header>
  );
};
