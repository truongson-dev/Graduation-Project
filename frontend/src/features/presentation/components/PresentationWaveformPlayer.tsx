import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/core/utils/cn';

export interface PresentationWaveformPlayerProps {
  audioUrl: string | null;
  durationLabel: string;
  wpm: number;
  fillers: number;
  aiSummary?: string;
  className?: string;
}

// Safely parse duration label (e.g. "03:15", "1:20", or seconds) into number of seconds
const parseDurationSeconds = (label?: string): number => {
  if (!label) return 0;
  const cleaned = label.trim();
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  const numeric = Number(cleaned);
  return !isNaN(numeric) && isFinite(numeric) && numeric > 0 ? numeric : 0;
};

// Safe formatter ensuring mm:ss without Infinity or NaN
const formatTime = (secs: number): string => {
  if (!isFinite(secs) || isNaN(secs) || secs < 0) return '00:00';
  const total = Math.floor(secs);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// 48 natural sound wave amplitude heights (percentage)
const WAVEFORM_BAR_HEIGHTS = [
  24, 38, 55, 30, 68, 82, 45, 62, 88, 72, 48, 78, 56, 68, 86, 94,
  58, 46, 76, 68, 52, 86, 98, 74, 54, 78, 64, 88, 82, 52, 64, 42,
  74, 84, 92, 66, 42, 68, 78, 56, 86, 58, 48, 72, 78, 52, 34, 22
];

export const PresentationWaveformPlayer: React.FC<PresentationWaveformPlayerProps> = ({
  audioUrl,
  durationLabel,
  wpm: _wpm,
  fillers,
  aiSummary,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  const parsedLabelSeconds = useMemo(() => parseDurationSeconds(durationLabel), [durationLabel]);

  // Effective duration prioritizes finite audio.duration, falling back to parsed duration label
  const effectiveDuration = useMemo(() => {
    if (isFinite(duration) && duration > 0) return duration;
    if (parsedLabelSeconds > 0) return parsedLabelSeconds;
    return 0;
  }, [duration, parsedLabelSeconds]);

  // Clean formatted display string for duration
  const displayDuration = useMemo(() => {
    if (effectiveDuration > 0) return formatTime(effectiveDuration);
    if (durationLabel && !durationLabel.includes('NaN') && !durationLabel.includes('Infinity')) {
      return durationLabel;
    }
    return '00:00';
  }, [effectiveDuration, durationLabel]);

  // Distribute filler markers on waveform ONLY if fillers > 0
  const fillerIndices = useMemo(() => {
    if (fillers <= 0) return new Set<number>();
    const indices = new Set<number>();
    const candidates = [14, 27, 35, 9, 41];
    const count = Math.min(fillers, candidates.length);
    for (let i = 0; i < count; i++) {
      indices.add(candidates[i]);
    }
    return indices;
  }, [fillers]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if ((!duration || !isFinite(duration)) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (parsedLabelSeconds > 0) {
        setDuration(parsedLabelSeconds);
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    if (parsedLabelSeconds > 0) {
      setDuration((prev) => (isFinite(prev) && prev > 0 ? prev : parsedLabelSeconds));
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl, parsedLabelSeconds, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current || effectiveDuration <= 0) return;
    const target = Math.max(0, Math.min(effectiveDuration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const seekToPercent = (percent: number) => {
    if (!audioRef.current || effectiveDuration <= 0) return;
    const target = Math.max(0, Math.min(effectiveDuration, (percent / 100) * effectiveDuration));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    seekToPercent(percent);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (moveX / rect.width) * 100));
    setHoverPercent(percent);
  };

  const currentPercent =
    effectiveDuration > 0
      ? Math.max(0, Math.min(100, (currentTime / effectiveDuration) * 100))
      : 0;

  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200/90 bg-white shadow-xs flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          crossOrigin="use-credentials"
          data-testid="presentation-audio"
        />
      )}

      <div>
        {/* Card Header: Title + Timer + Speed */}
        <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Volume2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Bản ghi âm bài thuyết trình
                </CardTitle>
                <p className="text-xs text-slate-500">
                  {audioUrl ? 'Nghe lại giọng nói và kiểm tra nhịp điệu phát âm' : 'Không có tệp ghi âm'}
                </p>
              </div>
            </div>

            {/* Timer & Speed Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1 text-xs">
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <span className="text-slate-300 font-mono">/</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {displayDuration}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cycleSpeed}
                data-testid="presentation-speed-btn"
                className="h-7 rounded-lg border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono font-bold px-2 cursor-pointer shadow-2xs hover:bg-slate-50"
                title="Tốc độ phát lại"
              >
                {playbackRate}x
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Card Content */}
        <CardContent className="px-5 sm:px-6 pt-0 pb-4 space-y-4">
          {/* Audio Transport Bar & Waveform */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Skip -5s */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleSkip(-5)}
                disabled={!audioUrl}
                className="size-9 shrink-0 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                title="Lùi 5 giây"
                aria-label="Lùi 5 giây"
              >
                <RotateCcw className="size-3.5" />
              </Button>

              {/* Play / Pause */}
              <Button
                type="button"
                size="icon"
                onClick={togglePlay}
                disabled={!audioUrl}
                data-testid="presentation-play-btn"
                className="size-10 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 active:scale-95"
                title={isPlaying ? 'Tạm dừng' : 'Phát bản ghi'}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát bản ghi'}
              >
                {isPlaying ? (
                  <Pause className="size-4.5 fill-current" />
                ) : (
                  <Play className="size-4.5 fill-current ml-0.5" />
                )}
              </Button>

              {/* Skip +5s */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleSkip(5)}
                disabled={!audioUrl}
                className="size-9 shrink-0 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                title="Tua tới 5 giây"
                aria-label="Tua tới 5 giây"
              >
                <RotateCw className="size-3.5" />
              </Button>

              {/* Interactive Waveform Track */}
              <div
                ref={waveformRef}
                onClick={handleWaveformClick}
                onMouseMove={handleWaveformMouseMove}
                onMouseLeave={() => setHoverPercent(null)}
                className="group relative flex h-12 flex-1 cursor-pointer items-end gap-[3px] overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 hover:bg-slate-100/70 transition-colors"
                role="slider"
                aria-label="Thanh trượt âm thanh"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(currentPercent)}
              >
                {/* Hover Tooltip */}
                {hoverPercent !== null && effectiveDuration > 0 && (
                  <div
                    className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full z-20 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white shadow-md"
                    style={{ left: `${hoverPercent}%` }}
                  >
                    {formatTime((hoverPercent / 100) * effectiveDuration)}
                  </div>
                )}

                {/* Hover Scrubber Line */}
                {hoverPercent !== null && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-px bg-slate-400/50"
                    style={{ left: `${hoverPercent}%` }}
                  />
                )}

                {/* Progress Cursor */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-15 w-0.5 bg-blue-600 transition-all duration-75"
                  style={{ left: `${currentPercent}%` }}
                >
                  <div className="-ml-[3px] -mt-0.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white shadow-xs" />
                </div>

                {/* Waveform Bars */}
                {WAVEFORM_BAR_HEIGHTS.map((h, i) => {
                  const percent = (i / WAVEFORM_BAR_HEIGHTS.length) * 100;
                  const isPast = percent <= currentPercent;
                  const isFillerSpike = fillers > 0 && fillerIndices.has(i);

                  let barColor = isPast
                    ? 'bg-blue-600'
                    : 'bg-slate-200 group-hover:bg-slate-300';

                  if (isFillerSpike) {
                    barColor = isPast ? 'bg-amber-500' : 'bg-amber-400';
                  }

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-colors duration-100",
                        barColor
                      )}
                      style={{ height: `${Math.max(16, h * 0.85)}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Dynamic Status Label (Clean & Intuitive) */}
            <div className="flex items-center justify-between px-1 text-[11px]">
              {fillers === 0 ? (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <CheckCircle2 className="size-3 text-emerald-500" /> Nhịp nói lưu loát, không phát hiện từ đệm
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-amber-700">
                  <AlertCircle className="size-3 text-amber-500" />
                  Phát hiện {fillers} vị trí từ đệm ({Math.min(fillers, 3)} vệt màu cam trên bản ghi)
                </span>
              )}
              <span className="text-slate-400 text-[10px] hidden sm:inline">
                Nhấp vào thanh sóng để tua
              </span>
            </div>
          </div>

          {/* AI Coach Feedback Block */}
          <div className="rounded-xl border border-blue-100/90 bg-gradient-to-br from-blue-50/50 via-slate-50/30 to-indigo-50/20 p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Góp ý từ Giảng viên AI
                  </h4>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 rounded-md px-1.5 py-0.5">
                    AI Mentor
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  {aiSummary || 'Bài nói duy trì tốc độ ổn định và truyền cảm. Hãy tiếp tục phát huy sự tự tin này trong các bài thuyết trình tới.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Symmetrical Footer matching PresentationRadarChart */}
      <CardFooter className="pt-2 pb-4 px-5 sm:px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          <span>Âm thanh chất lượng tốt</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-400 font-sans">Thời lượng:</span>
          <strong className="text-slate-800 font-bold">{displayDuration}</strong>
        </div>
      </CardFooter>
    </Card>
  );
};
