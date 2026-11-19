import React from 'react';
import { useMe } from '@/features/auth/api/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mic, MicOff, Sparkles, ScanFace, AlertCircle } from 'lucide-react';
import { cn } from '@/core/utils/cn';

type SessionStatus = 'ready' | 'starting' | 'live' | 'paused' | 'ended';

interface SpeakerTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  poseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stream?: MediaStream | null;
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

export const SpeakerTile: React.FC<SpeakerTileProps> = ({
  videoRef,
  poseCanvasRef,
  stream,
  isActive,
  voiceLevel,
  eyeContact: _eyeContact,
  posture: _posture,
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
  const userName = me.data?.name || 'Võ Hoàng Nam';
  const userAvatar = me.data?.avatar_url || '';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'VN';

  const isSpeaking = isActive && !isMicMuted && voiceLevel > 12;

  React.useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
  }, [stream, videoRef]);

  return (
    <div
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-2xl bg-[#18191c] border border-white/10 shadow-lg transition-all duration-200 select-none",
        isSpeaking
          ? "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          : "ring-1 ring-white/5",
        className
      )}
    >
      {/* Video / Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full scale-x-[-1] object-cover"
      />

      {/* AI Skeleton Overlay */}
      {showSkeleton && (
        <canvas
          ref={poseCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
        />
      )}

      {/* Google Meet / Discord Camera Off State: Initial Avatar in Circle */}
      {(!isActive || isCameraMuted) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#18191c] text-white">
          <Avatar className="size-20 border-2 border-white/10 shadow-xl">
            {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-700 text-2xl font-bold text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 text-xs font-medium text-neutral-400">
            {isCameraMuted
              ? 'Máy ảnh đã tắt'
              : status === 'ready'
              ? 'Sẵn sàng thuyết trình'
              : 'Đang tải máy ảnh…'}
          </p>
        </div>
      )}

      {/* Top-Right: Quick Skeleton Toggle Button using shadcn Tooltip + Button */}
      {isActive && onToggleSkeleton && (
        <div className="absolute right-2.5 top-2.5 z-20">
          <TooltipProvider delay={150}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSkeleton}
                    aria-label={showSkeleton ? 'Ẩn khung xương AI' : 'Hiện khung xương AI'}
                    className={cn(
                      "size-7 rounded-full backdrop-blur-md transition-all border border-white/10 shadow-sm cursor-pointer",
                      showSkeleton
                        ? "bg-black/60 text-white hover:bg-black/80 hover:text-white"
                        : "bg-black/40 text-neutral-400 hover:bg-black/70 hover:text-white"
                    )}
                  />
                }
              >
                <Sparkles className={cn("size-3.5", showSkeleton ? "text-amber-400" : "text-neutral-400")} />
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-neutral-900 text-white text-[11px] px-2 py-1 border-neutral-700">
                {showSkeleton ? 'Ẩn khung xương AI' : 'Hiện khung xương AI'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Bottom Left: Google Meet / Discord Name Pill (Exact match to Google Meet/Discord design) */}
      <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/80 px-2.5 py-1 text-xs font-medium text-white shadow-md backdrop-blur-md border border-white/10">
          {/* Circular Mic Indicator */}
          {isMicMuted ? (
            <span
              className="flex size-4.5 items-center justify-center rounded-full bg-white/20 text-neutral-300 shrink-0"
              title="Microphone đã tắt"
            >
              <MicOff className="size-2.5 stroke-[2.5]" />
            </span>
          ) : isSpeaking ? (
            <span
              className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0 shadow-xs"
              title="Đang nói"
            >
              <span className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:0ms] h-full" />
                <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
                <span className="w-0.5 bg-white rounded-full animate-bounce [animation-delay:300ms] h-4/5" />
              </span>
            </span>
          ) : (
            <span
              className="flex size-4.5 items-center justify-center rounded-full bg-white/20 text-neutral-300 shrink-0"
              title="Microphone đang bật"
            >
              <Mic className="size-2.5" />
            </span>
          )}

          <span className="max-w-[150px] truncate text-xs font-medium tracking-tight text-white select-none">
            {userName}
          </span>
        </div>
      </div>

      {/* Bottom Right: Camera Guidance pill using shadcn Badge */}
      {isActive && cameraGuidance && (
        <div className="absolute bottom-2.5 right-2.5 z-20 hidden sm:flex items-center">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-medium text-neutral-200 backdrop-blur-md border border-white/10 shadow-sm"
          >
            <ScanFace className="size-3 text-teal-400 shrink-0" />
            <span className="max-w-[130px] truncate">{cameraGuidance}</span>
          </Badge>
        </div>
      )}

      {/* Face Missing Alert Banner */}
      {faceMissing && isActive && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute top-2.5 left-2.5 right-11 z-20 flex items-center gap-2 rounded-lg bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md animate-in fade-in"
        >
          <AlertCircle className="size-3.5 shrink-0 text-white animate-pulse" />
          <span className="truncate">Không phát hiện người trước camera!</span>
        </div>
      )}

      {/* Camera Error Banner */}
      {cameraError && (
        <div
          role="alert"
          className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center gap-2 rounded-lg bg-amber-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md"
        >
          <AlertCircle className="size-3.5 shrink-0 text-white" />
          <span className="truncate">{cameraError}</span>
        </div>
      )}
    </div>
  );
};
