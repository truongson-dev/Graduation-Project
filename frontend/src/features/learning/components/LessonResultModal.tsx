import React from 'react';
import type { AttemptResult } from '../types';
import { AppIcon as Icon } from '@/components/layout/AppIcon';

interface LessonResultModalProps {
  result: AttemptResult;
  lessonTitle: string;
  onNextLesson?: () => void;
  onRetry: () => void;
  onBackToPath: () => void;
}

export const LessonResultModal: React.FC<LessonResultModalProps> = ({
  result,
  lessonTitle,
  onNextLesson,
  onRetry,
  onBackToPath,
}) => {
  const isPassed = result.passed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header result */}
        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${
              isPassed
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-rose-500/20'
            }`}
          >
            <Icon name={isPassed ? 'emoji_events' : 'replay'} className="text-3xl" />
          </div>

          <h2 className="mt-4 text-xl font-extrabold text-[#213a61] sm:text-2xl">
            {isPassed ? 'Chúc mừng bạn đã hoàn thành!' : 'Chưa đạt điểm yêu cầu'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{lessonTitle}</p>

          {/* Metrics summary */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ĐIỂM SỐ
              </span>
              <span className={`text-2xl font-black ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.score}
                <span className="text-xs font-semibold text-slate-400"> / 100</span>
              </span>
            </div>

            {result.xp_earned > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  KINH NGHIỆM
                </span>
                <span className="flex items-center justify-center gap-1 text-2xl font-black text-blue-600">
                  <Icon name="bolt" className="text-xl" />
                  <span>+{result.xp_earned} XP</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AI Feedback for Writing */}
        {result.ai_feedback && (
          <div className="mt-6 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Icon name="psychology" className="text-base" />
              <span>Nhận xét từ AI Giảng Viên</span>
            </div>

            {result.ai_feedback.summary && (
              <p className="text-xs leading-relaxed text-slate-700 sm:text-sm font-medium">
                {result.ai_feedback.summary}
              </p>
            )}

            {result.ai_feedback.strengths && result.ai_feedback.strengths.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-bold text-emerald-700">Điểm mạnh:</span>
                <ul className="mt-1 space-y-1">
                  {result.ai_feedback.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <Icon name="check" className="mt-0.5 text-sm text-emerald-600 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.ai_feedback.improvements && result.ai_feedback.improvements.length > 0 && (
              <div className="mt-3">
                <span className="text-xs font-bold text-amber-700">Gợi ý cải thiện:</span>
                <ul className="mt-1 space-y-1">
                  {result.ai_feedback.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <Icon name="lightbulb" className="mt-0.5 text-sm text-amber-500 shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quiz Detailed Results */}
        {result.results && result.results.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chi tiết các câu hỏi
            </h4>
            <div className="space-y-2">
              {result.results.map((q, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3.5 text-xs transition ${
                    q.correct
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                      : 'border-rose-200 bg-rose-50/50 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <Icon
                      name={q.correct ? 'check_circle' : 'cancel'}
                      className={q.correct ? 'text-emerald-600' : 'text-rose-500'}
                    />
                    <span>Câu {q.question_index + 1}: {q.correct ? 'Chính xác' : 'Chưa đúng'}</span>
                  </div>
                  {q.explanation && (
                    <p className="mt-1 text-slate-600 leading-relaxed">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBackToPath}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Quay về lộ trình
          </button>

          {!isPassed && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Icon name="replay" className="text-sm" />
              <span>Thử lại</span>
            </button>
          )}

          {isPassed && result.next_lesson && onNextLesson && (
            <button
              type="button"
              onClick={onNextLesson}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <span>Học bài tiếp theo</span>
              <Icon name="arrow_forward" className="text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
