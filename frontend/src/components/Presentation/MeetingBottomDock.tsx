import React from 'react';
import { AppIcon as Icon } from '../Common/AppIcon';

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';

interface MeetingBottomDockProps {
  status: SessionStatus;
  isMicMuted: boolean;
  isCameraMuted: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onTogglePause: () => void;
  onFinishSession: () => void;
  slideNumber: number;
  slideCount: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  isAiDrawerOpen: boolean;
  onToggleAiDrawer: () => void;
  showCaptions: boolean;
  onToggleCaptions: () => void;
  voiceLevel: number;
  className?: string;
}

export const MeetingBottomDock: React.FC<MeetingBottomDockProps> = ({
  status,
  isMicMuted,
  isCameraMuted,
  onToggleMic,
  onToggleCamera,
  onTogglePause,
  onFinishSession,
  slideNumber,
  slideCount,
  onPrevSlide,
  onNextSlide,
  isAiDrawerOpen,
  onToggleAiDrawer,
  showCaptions,
  onToggleCaptions,
  voiceLevel,
  className = '',
}) => {
  const isSessionRunning = status === 'live' || status === 'paused';
  const isPaused = status === 'paused';

  return (
    <footer
      aria-label="Thanh điều khiển Google Meet"
      className={`relative z-40 flex h-20 w-full items-center justify-between bg-[#202124] px-4 sm:px-6 select-none ${className}`}
    >
      {/* Left: Meeting Info / Code */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
          <span className="font-semibold text-white">mak-pyhx-mra</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-400">Trang {slideNumber}/{slideCount || 1}</span>
        </div>
      </div>

      {/* Center: Google Meet Standard Circular Control Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Microphone Button */}
        <button
          type="button"
          onClick={onToggleMic}
          disabled={!isSessionRunning}
          title={isMicMuted ? 'Bật micro (Ctrl + D)' : 'Tắt micro (Ctrl + D)'}
          className={`relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 ${
            isMicMuted
              ? 'bg-[#ea4335] text-white hover:bg-[#d93025]'
              : voiceLevel > 12
              ? 'bg-[#3c4043] text-[#8ab4f8] ring-2 ring-[#8ab4f8]/80'
              : 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
          }`}
        >
          <Icon name={isMicMuted ? 'mic_off' : 'mic'} className="text-xl" />
        </button>

        {/* Camera Button */}
        <button
          type="button"
          onClick={onToggleCamera}
          disabled={!isSessionRunning}
          title={isCameraMuted ? 'Bật máy ảnh (Ctrl + E)' : 'Tắt máy ảnh (Ctrl + E)'}
          className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 ${
            isCameraMuted
              ? 'bg-[#ea4335] text-white hover:bg-[#d93025]'
              : 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
          }`}
        >
          <Icon name={isCameraMuted ? 'videocam_off' : 'videocam'} className="text-xl" />
        </button>

        {/* Screen Share / Presentation Active Indicator (Google Meet Style) */}
        <div
          title="Bạn đang trình bày màn hình"
          className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#8ab4f8] text-[#202124] shadow-sm cursor-default"
        >
          <Icon name="present_to_all" className="text-xl" />
        </div>

        {/* Live Captions [CC] Toggle */}
        <button
          type="button"
          onClick={onToggleCaptions}
          title={showCaptions ? 'Tắt phụ đề trực tiếp' : 'Bật phụ đề trực tiếp (C)'}
          className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all active:scale-95 ${
            showCaptions
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
          }`}
        >
          <Icon name="closed_caption" className="text-xl" />
        </button>

        {/* Pause / Resume Button (Represented by hand raise or pause in Meet) */}
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!isSessionRunning}
          title={isPaused ? 'Tiếp tục thuyết trình' : 'Tạm dừng buổi tập'}
          className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40 ${
            isPaused
              ? 'bg-amber-400 text-[#202124] animate-pulse ring-2 ring-amber-300'
              : 'bg-[#3c4043] text-white hover:bg-[#4a4e52]'
          }`}
        >
          <Icon name={isPaused ? 'play_arrow' : 'pause'} className="text-xl" />
        </button>

        {/* Slide Navigation Pill (Integrated into Meet center controls) */}
        <div className="flex items-center bg-[#3c4043] rounded-full px-1 py-0.5 border border-neutral-600/30">
          <button
            type="button"
            disabled={slideNumber <= 1}
            onClick={onPrevSlide}
            title="Trang trước (←)"
            className="flex h-10 w-8 items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30"
          >
            <Icon name="chevron_left" className="text-lg" />
          </button>
          <span className="px-1.5 text-xs font-bold text-white tracking-wider">
            {slideNumber}/{slideCount || 1}
          </span>
          <button
            type="button"
            disabled={Boolean(slideCount && slideNumber >= slideCount)}
            onClick={onNextSlide}
            title="Trang sau (→)"
            className="flex h-10 w-8 items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30"
          >
            <Icon name="chevron_right" className="text-lg" />
          </button>
        </div>

        {/* End Call / Leave Call Red Pill Button (Google Meet Authentic Hangup) */}
        <button
          type="button"
          onClick={onFinishSession}
          title="Rời khỏi cuộc gọi và xem đánh giá AI"
          aria-label="Rời khỏi cuộc gọi"
          className="flex h-11 w-14 sm:h-12 sm:w-16 items-center justify-center rounded-full bg-[#ea4335] text-white hover:bg-[#d93025] shadow-lg active:scale-95 transition-all ml-1 sm:ml-2"
        >
          <Icon name="call_end" className="text-2xl" />
        </button>
      </div>

      {/* Right: Meet Utility Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-[140px] justify-end">
        {/* Info */}
        <button
          type="button"
          title="Thông tin chi tiết cuộc họp"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 hover:bg-[#3c4043] hover:text-white transition-colors"
        >
          <Icon name="info" className="text-xl" />
        </button>

        {/* People */}
        <button
          type="button"
          title="Mọi người (2)"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 hover:bg-[#3c4043] hover:text-white transition-colors"
        >
          <Icon name="people" className="text-xl" />
        </button>

        {/* Chat / In-call messaging */}
        <button
          type="button"
          onClick={onToggleAiDrawer}
          title={isAiDrawerOpen ? 'Đóng trò chuyện & Huấn luyện viên' : 'Trò chuyện trong cuộc gọi & AI Coach'}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isAiDrawerOpen
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'text-neutral-300 hover:bg-[#3c4043] hover:text-white'
          }`}
        >
          <Icon name="chat" className="text-xl" />
        </button>

        {/* Activities / AI Coach (Google Meet Shapes icon) */}
        <button
          type="button"
          onClick={onToggleAiDrawer}
          title="Hoạt động AI & Phân tích tác phong"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isAiDrawerOpen
              ? 'bg-[#8ab4f8] text-[#202124]'
              : 'text-neutral-300 hover:bg-[#3c4043] hover:text-white'
          }`}
        >
          <Icon name="category" className="text-xl" />
        </button>

        {/* Host controls */}
        <button
          type="button"
          title="Bộ điều khiển của người tổ chức"
          className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 hover:bg-[#3c4043] hover:text-white transition-colors"
        >
          <Icon name="lock" className="text-xl" />
        </button>
      </div>
    </footer>
  );
};
