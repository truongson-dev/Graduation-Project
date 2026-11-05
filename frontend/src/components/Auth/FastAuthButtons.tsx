import React from 'react';
import { GoogleIcon } from '../Common/GoogleIcon';
import { AppIcon } from '../Common/AppIcon';

interface FastAuthButtonsProps {
  onGoogleClick?: () => void;
  isLoading?: boolean;
}

export const FastAuthButtons: React.FC<FastAuthButtonsProps> = ({ onGoogleClick, isLoading = false }) => {
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={onGoogleClick}
        disabled={isLoading}
        className="auth-google w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-semibold text-slate-700 active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <AppIcon name="progress_activity" className="animate-spin text-[18px]" />
        ) : (
          <GoogleIcon className="w-4 h-4 shrink-0" />
        )}
        <span>{isLoading ? 'Đang chuyển tới Google...' : 'Tiếp tục với Google'}</span>
      </button>
    </div>
  );
};
