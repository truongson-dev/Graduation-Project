import React from 'react';
import { AuthMode } from '../types/auth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthTabsProps {
  currentMode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ currentMode, onChangeMode }) => {
  return (
    <Tabs
      value={currentMode}
      onValueChange={(value) => onChangeMode(value as AuthMode)}
      className="w-full max-w-sm mx-auto mb-6"
    >
      <TabsList
        aria-label="Chuyển chế độ đăng nhập hoặc đăng ký"
        className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-11 h-11 p-1 rounded-full bg-slate-100/80 border border-slate-200/60"
      >
        <TabsTrigger
          value="login"
          id="tab-login"
          aria-controls="auth-form"
          className="inline-flex h-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-slate-500 transition-all duration-200 hover:text-slate-800 [&_svg]:text-slate-400 data-active:bg-white data-active:text-[#002045] data-active:shadow-[0_2px_8px_rgba(0,32,69,0.08)] data-active:[&_svg]:text-blue-600 cursor-pointer"
        >
          <LogIn className="size-4 shrink-0 transition-colors" />
          <span>Đăng nhập</span>
        </TabsTrigger>
        <TabsTrigger
          value="register"
          id="tab-register"
          aria-controls="auth-form"
          className="inline-flex h-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-slate-500 transition-all duration-200 hover:text-slate-800 [&_svg]:text-slate-400 data-active:bg-white data-active:text-[#002045] data-active:shadow-[0_2px_8px_rgba(0,32,69,0.08)] data-active:[&_svg]:text-blue-600 cursor-pointer"
        >
          <UserPlus className="size-4 shrink-0 transition-colors" />
          <span>Đăng ký mới</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
