import React from 'react';
import { AuthMode } from '../../types/auth';
import { AppIcon } from '../Common/AppIcon';

interface AuthTabsProps {
  currentMode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ currentMode, onChangeMode }) => {
  return (
    <div
      role="tablist"
      aria-label="Chuyển chế độ đăng nhập hoặc đăng ký"
      className="auth-tabs flex p-1 rounded-2xl mb-5 max-w-sm mx-auto w-full"
    >
      <button
        role="tab"
        id="tab-login"
        aria-selected={currentMode === 'login'}
        aria-controls="auth-form"
        type="button"
        onClick={() => onChangeMode('login')}
        className={`auth-tab flex-1 py-2.5 text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
          currentMode === 'login'
            ? 'is-active text-[#002045] font-bold scale-[1.01]'
            : 'text-slate-600 hover:text-[#002045] font-medium'
        }`}
      >
        <AppIcon name="login" className="text-[18px]" />
        <span>Đăng nhập</span>
      </button>

      <button
        role="tab"
        id="tab-register"
        aria-selected={currentMode === 'register'}
        aria-controls="auth-form"
        type="button"
        onClick={() => onChangeMode('register')}
        className={`auth-tab flex-1 py-2.5 text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
          currentMode === 'register'
            ? 'is-active text-[#002045] font-bold scale-[1.01]'
            : 'text-slate-600 hover:text-[#002045] font-medium'
        }`}
      >
        <AppIcon name="person_add" className="text-[18px]" />
        <span>Đăng ký mới</span>
      </button>
    </div>
  );
};
