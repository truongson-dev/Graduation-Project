import React, { useEffect, useState } from 'react';
import { useMe } from '../../lib/auth';

interface MeetingTopBarProps {
  fileName: string;
  isPdf: boolean;
  status: 'ready' | 'starting' | 'live' | 'paused' | 'ended';
  seconds: number;
  onFinishSession: () => void;
  className?: string;
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export const MeetingTopBar: React.FC<MeetingTopBarProps> = ({
  status,
  seconds,
  onFinishSession,
  className = '',
}) => {
  const me = useMe();
  const userName = me.data?.name || 'Võ Hoàng Nam (VHN DEV)';
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <header
      className={`relative z-30 flex h-14 w-full items-center justify-between bg-[#202124] px-4 text-[#e8eaed] select-none ${className}`}
    >
      {/* Left: Meeting Time & Code */}
      <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
        <span className="text-white font-semibold">{currentTime}</span>
        <span className="text-neutral-500 font-light">|</span>
        <span className="text-neutral-200">mak-pyhx-mra</span>
        <button
          type="button"
          title="Thông tin cuộc họp"
          className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-[#3c4043] hover:text-white transition-colors"
        >
          <Icon name="info" className="text-base" />
        </button>
      </div>

      {/* Center: Google Meet Presentation Banner */}
      <div className="flex items-center">
        <div className="flex items-center gap-2.5 sm:gap-3 rounded-full bg-[#3c4043] py-1 pl-3 pr-1.5 shadow-md border border-neutral-600/30">
          {/* Screen presentation icon */}
          <Icon name="present_to_all" className="text-lg text-[#8ab4f8]" />

          {/* User name & presentation label */}
          <span className="text-xs font-semibold text-white tracking-wide max-w-[200px] sm:max-w-[340px] truncate">
            {userName} (Bạn, đang trình bày)
          </span>

          <span className="text-neutral-500 font-light hidden sm:inline">|</span>

          {/* Sound presentation indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-300 font-medium">
            <span>Âm thanh bản trình bày</span>
            <span className="flex h-5 w-8 items-center rounded-full bg-[#8ab4f8] px-1 justify-end">
              <span className="h-3 w-3 rounded-full bg-[#202124]" />
            </span>
          </div>

          {/* Live Recording / Timer Pill */}
          {status === 'live' && (
            <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              {formatSeconds(seconds)}
            </span>
          )}

          {/* Stop Presenting Button (Google Meet Blue Pill Button) */}
          <button
            type="button"
            onClick={onFinishSession}
            title="Dừng trình bày và chuyển sang đánh giá AI"
            className="rounded-full bg-[#8ab4f8] px-3.5 py-1 text-xs font-bold text-[#202124] shadow-sm hover:bg-[#a8c7fa] active:scale-95 transition-all"
          >
            Dừng trình bày
          </button>
        </div>
      </div>

      {/* Right: Participants Avatar Badge (2 People: You + AI Coach) */}
      <div className="flex items-center gap-2">
        <div
          title="2 người tham gia: Bạn & AI Huấn luyện viên"
          className="flex items-center gap-1.5 rounded-full bg-[#3c4043] px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-600 cursor-pointer transition-colors"
        >
          {/* Overlapping avatar icons */}
          <div className="flex -space-x-1.5 items-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white ring-1 ring-[#202124]">
              VN
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-1 ring-[#202124]">
              <Icon name="smart_toy" className="text-xs" />
            </span>
          </div>
          <span className="text-xs font-bold pl-0.5">2</span>
        </div>
      </div>
    </header>
  );
};
