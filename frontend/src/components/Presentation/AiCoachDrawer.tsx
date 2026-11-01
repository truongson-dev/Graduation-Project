import React, { useState } from 'react';

interface AiCoachDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wordsPerMinute: number;
  fillers: number;
  confidence: number | null;
  voiceLevel: number;
  posture: number;
  eyeContact: number;
  gestureFeedback: string;
  gestureCount: number;
  transcript: string;
  isActive: boolean;
  speechError?: string;
  className?: string;
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export const AiCoachDrawer: React.FC<AiCoachDrawerProps> = ({
  isOpen,
  onClose,
  wordsPerMinute,
  fillers,
  confidence,
  voiceLevel,
  posture,
  eyeContact,
  gestureFeedback,
  gestureCount,
  transcript,
  isActive,
  speechError = '',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'transcript'>('coach');

  if (!isOpen) return null;

  const getPaceStatus = (wpm: number) => {
    if (wpm === 0) return { label: 'Đang lắng nghe…', color: 'text-neutral-400', badge: 'bg-[#3c4043] text-neutral-300' };
    if (wpm < 100) return { label: 'Chậm rãi, rõ ràng', color: 'text-[#8ab4f8]', badge: 'bg-blue-950/80 text-blue-300 border-blue-800/50' };
    if (wpm <= 155) return { label: 'Tốc độ tối ưu', color: 'text-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50' };
    if (wpm <= 175) return { label: 'Hơi nhanh', color: 'text-amber-400', badge: 'bg-amber-950/80 text-amber-300 border-amber-800/50' };
    return { label: 'Quá nhanh, cần chậm lại', color: 'text-rose-400', badge: 'bg-rose-950/80 text-rose-300 border-rose-800/50' };
  };

  const paceInfo = getPaceStatus(wordsPerMinute);

  const getAiSuggestion = () => {
    if (!isActive) return 'Bắt đầu bài nói để AI bắt đầu lắng nghe và phân tích phong cách thuyết trình của bạn.';
    if (fillers >= 3) return 'Bạn đang dùng nhiều từ đệm (ừm, à). Hãy dừng 1 nhịp thở thay vì nói từ đệm khi chuyển ý.';
    if (posture > 0 && posture < 65) return 'Giữ hai vai cân bằng và hướng người về camera để tạo cảm giác tự tin và chuyên nghiệp.';
    if (eyeContact > 0 && eyeContact < 50) return 'Tăng cường nhìn thẳng vào camera để tạo kết nối tự nhiên với người nghe.';
    if (wordsPerMinute > 165) return 'Tốc độ đang hơi nhanh. Giảm nhịp lại ở những luận điểm mấu chốt.';
    if (eyeContact >= 65 && posture >= 70) return 'Tác phong rất tốt! Duy trì sự tương tác mắt và nhịp nói ổn định này.';
    return 'Hãy nói rõ từng luận điểm và duy trì ánh mắt hướng về người nghe.';
  };

  return (
    <aside
      className={`relative z-30 flex h-full w-80 sm:w-96 flex-col bg-[#202124] border-l border-neutral-700/60 text-[#e8eaed] transition-all select-none ${className}`}
      aria-label="Google Meet In-Call Panel"
    >
      {/* Google Meet Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-700/60">
        <h2 className="text-base font-semibold text-white tracking-wide">
          {activeTab === 'coach' ? 'AI Huấn luyện viên' : 'Tin nhắn & Phụ đề'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          title="Đóng bảng điều khiển"
          aria-label="Đóng"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-[#3c4043] hover:text-white transition-colors"
        >
          <Icon name="close" className="text-lg" />
        </button>
      </div>

      {/* Meet Tabs Switcher */}
      <div className="flex border-b border-neutral-700/60 bg-[#202124] px-2">
        <button
          type="button"
          onClick={() => setActiveTab('coach')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'coach'
              ? 'border-[#8ab4f8] text-[#8ab4f8]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Icon name="psychology" className="text-base" />
          <span>Tác phong AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transcript')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'transcript'
              ? 'border-[#8ab4f8] text-[#8ab4f8]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Icon name="closed_caption" className="text-base" />
          <span>Lời thoại Live</span>
          {transcript && <span className="h-1.5 w-1.5 rounded-full bg-[#8ab4f8]" />}
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-700">
        {activeTab === 'coach' ? (
          <>
            {/* Quick Suggestion Box */}
            <div className="rounded-2xl border border-teal-500/30 bg-[#282a2d] p-3.5 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                <Icon name="lightbulb" className="text-base text-amber-400 animate-pulse" />
                <span>Gợi ý trực tiếp</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-200">
                {getAiSuggestion()}
              </p>
            </div>

            {/* WPM Pace Meter */}
            <div className="rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-semibold flex items-center gap-1.5 text-neutral-300">
                  <Icon name="speed" className="text-[#8ab4f8] text-sm" />
                  Tốc độ nói
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${paceInfo.badge}`}>
                  {wordsPerMinute ? `${wordsPerMinute} WPM` : 'Chờ lời'}
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {wordsPerMinute || '—'}
                </span>
                <span className="text-xs text-neutral-400">từ / phút</span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 via-teal-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, (wordsPerMinute / 180) * 100))}%` }}
                />
              </div>

              <p className={`mt-2 text-[11px] font-medium ${paceInfo.color}`}>
                {paceInfo.label}
              </p>
            </div>

            {/* Filler Words & Confidence Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold">Từ đệm</span>
                  <Icon name="warning" className={`text-sm ${fillers > 2 ? 'text-amber-400' : 'text-neutral-500'}`} />
                </div>
                <p className="mt-1.5 text-2xl font-black text-amber-300">
                  {fillers} <span className="text-xs font-normal text-neutral-400">lần</span>
                </p>
                <p className="mt-0.5 text-[10px] text-neutral-400 truncate">
                  {fillers > 0 ? 'ừm, à, thì là…' : 'Chưa phát hiện'}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold">Điểm tự tin</span>
                  <Icon name="verified" className="text-[#8ab4f8] text-sm" />
                </div>
                <p className="mt-1.5 text-2xl font-black text-white">
                  {isActive && confidence !== null ? confidence : '—'}
                  {confidence !== null && <span className="text-xs font-normal text-neutral-400">/100</span>}
                </p>
                <p className="mt-0.5 text-[10px] text-[#8ab4f8]">
                  {confidence !== null && confidence >= 70 ? 'Rất tự tin' : 'Đang phân tích'}
                </p>
              </div>
            </div>

            {/* Audio Waves & Posture Feedback */}
            <div className="rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3.5 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold flex items-center gap-1 text-neutral-300">
                    <Icon name="graphic_eq" className="text-teal-400 text-sm" />
                    Âm lượng giọng
                  </span>
                  <span className="font-mono text-[11px] text-neutral-300">
                    {voiceLevel ? `${Math.round(20 * Math.log10(Math.max(0.01, voiceLevel / 100)))} dB` : '— dB'}
                  </span>
                </div>

                <div className="mt-2 flex h-6 items-center gap-0.5 rounded-lg bg-[#202124] px-2">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-full bg-[#8ab4f8] transition-all duration-75"
                      style={{
                        height: `${voiceLevel ? 4 + ((voiceLevel + index * 11) % 18) : 4}px`,
                        opacity: voiceLevel ? 0.4 + ((index + voiceLevel) % 6) / 8 : 0.25,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-neutral-700/60 pt-2 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Cử chỉ tay:</span>
                <span className="font-semibold text-teal-300">
                  {gestureCount} cử chỉ ({gestureFeedback})
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Live Subtitle Transcript Stream */
          <div className="flex h-full flex-col">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <Icon name="subtitles" className="text-[#8ab4f8] text-sm" />
                Phụ đề nhận dạng thời gian thực
              </span>
              <span className="text-[10px] text-neutral-400">
                {transcript ? `${transcript.split(/\s+/).filter(Boolean).length} từ` : '0 từ'}
              </span>
            </div>

            {speechError && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                <Icon name="warning" className="text-base shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            <div className="flex-1 rounded-2xl border border-neutral-700/60 bg-[#282a2d] p-3.5 text-xs leading-relaxed text-neutral-200 min-h-[300px] overflow-y-auto">
              {transcript ? (
                <p className="whitespace-pre-wrap">{transcript}</p>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500 py-12">
                  <Icon name={speechError ? 'mic_off' : 'mic_none'} className={`text-3xl mb-2 ${speechError ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <p className="text-xs text-neutral-300">
                    {speechError ? 'Chưa thể nhận diện giọng nói' : 'Chưa có lời thoại nào được ghi nhận.'}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                    {speechError || 'Hãy bắt đầu nói vào microphone, phụ đề sẽ hiển thị tự động.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
