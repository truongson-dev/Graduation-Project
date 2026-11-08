import React from 'react';
import { useMe } from '@/features/auth/api/auth';

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';

interface SpeakerTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  poseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  voiceLevel: number;
  eyeContact: number;
  posture: number;
  cameraGuidance: string;
  cameraError: string;
  faceMissing: boolean;
  status: SessionStatus;
  isMicMuted?: boolean;
  isCameraMuted?: boolean;
  showSkeleton?: boolean;
  onToggleSkeleton?: () => void;
  className?: string;
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export const SpeakerTile: React.FC<SpeakerTileProps> = ({
  videoRef,
  poseCanvasRef,
  isActive,
  voiceLevel,
  eyeContact,
  posture,
  cameraGuidance,
  cameraError,
  faceMissing,
  status,
  isMicMuted = false,
  isCameraMuted = false,
  showSkeleton = true,
  onToggleSkeleton,
  className = '',
}) => {
  const me = useMe();
  const userName = me.data?.name || 'Võ Hoàng Nam (VHN DEV)';
  const isSpeaking = isActive && !isMicMuted && voiceLevel > 12;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-[#3c4043] shadow-2xl transition-all duration-200 ${
        isSpeaking
          ? 'ring-4 ring-[#8ab4f8] shadow-[0_0_20px_rgba(138,180,248,0.4)]'
          : 'ring-1 ring-neutral-700/60'
      } ${className}`}
    >
      {/* Video / Camera Feed */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#202124]">
        {isActive && !isCameraMuted ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full scale-x-[-1] object-cover"
            />
            {showSkeleton && (
              <canvas
                ref={poseCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
              />
            )}
          </>
        ) : (
          /* Google Meet Camera Off State: Initial Avatar in Circle */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#202124] text-white">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-teal-600 text-2xl sm:text-3xl font-bold shadow-lg">
              {userName.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'VN'}
            </div>
            <p className="mt-2 text-xs text-neutral-400 font-medium">
              {isCameraMuted ? 'Máy ảnh đã tắt' : 'Đang tải máy ảnh…'}
            </p>
          </div>
        )}

        {/* Top HUD Badges (AI SoftSkill Tracking) */}
        {isActive && (
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-1.5">
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-md transition-colors ${
                eyeContact >= 60
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                  : eyeContact >= 35
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
              }`}
            >
              <Icon name="visibility" className="text-xs" />
              <span>Mắt: {eyeContact}%</span>
            </div>

            <div
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-md transition-colors ${
                posture >= 70
                  ? 'bg-teal-950/80 text-teal-300 border border-teal-600/50'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
              }`}
            >
              <Icon name="accessibility_new" className="text-xs" />
              <span>{posture >= 70 ? 'Tư thế: Chuẩn' : 'Tư thế: Cần chỉnh'}</span>
            </div>
          </div>
        )}

        {/* Top-Right: Quick Skeleton Toggle & Camera Guidance */}
        {isActive && (
          <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1">
            {onToggleSkeleton && (
              <button
                type="button"
                onClick={onToggleSkeleton}
                title={showSkeleton ? 'Ẩn khung xương AI' : 'Hiện khung xương AI'}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-neutral-300 backdrop-blur-md hover:text-white"
              >
                <Icon name={showSkeleton ? 'motion_photos_on' : 'motion_photos_off'} className="text-xs" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Left: Google Meet Participant Name Label */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
          {/* Mic muted red badge or mic wave */}
          {isMicMuted ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ea4335] text-[10px] text-white">
              <Icon name="mic_off" className="text-[11px]" />
            </span>
          ) : isSpeaking ? (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-[#8ab4f8] rounded-full animate-bounce [animation-delay:0ms] h-full" />
              <span className="w-0.5 bg-[#8ab4f8] rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
              <span className="w-0.5 bg-[#8ab4f8] rounded-full animate-bounce [animation-delay:300ms] h-4/5" />
            </span>
          ) : (
            <Icon name="mic" className="text-xs text-neutral-400" />
          )}

          <span className="max-w-[160px] truncate">{userName}</span>
        </div>

        {/* Camera Guidance pill on bottom right */}
        {isActive && cameraGuidance && (
          <div className="absolute bottom-2.5 right-2.5 z-10 hidden sm:flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] text-neutral-300 backdrop-blur-md">
            <Icon name="center_focus_strong" className="text-[10px] text-teal-400" />
            <span className="max-w-[120px] truncate">{cameraGuidance}</span>
          </div>
        )}
      </div>

      {/* Face Missing Alert Banner */}
      {faceMissing && isActive && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-1.5 bg-[#ea4335] px-2.5 py-1 text-[11px] font-bold text-white"
        >
          <Icon name="warning" className="text-sm animate-pulse" />
          <span className="truncate">Cảnh báo: Không phát hiện người trước camera!</span>
        </div>
      )}

      {cameraError && (
        <div role="alert" className="bg-amber-600 px-2.5 py-1 text-[11px] text-white truncate">
          {cameraError}
        </div>
      )}
    </div>
  );
};
