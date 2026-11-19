import React, { useState } from 'react';
import type { LessonContent } from '../types';
import { AppIcon as Icon } from '@/components/layout/AppIcon';

interface WritingContentProps {
  content: LessonContent;
  onSubmit: (text: string) => void;
  isSubmitting?: boolean;
}

export const WritingContent: React.FC<WritingContentProps> = ({
  content,
  onSubmit,
  isSubmitting = false,
}) => {
  const [text, setText] = useState('');
  const [showRubric, setShowRubric] = useState(false);

  const charCount = text.trim().length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const isValid = charCount >= 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    onSubmit(text);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Exercise Prompt */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <Icon name="edit_note" className="text-base" />
          <span>Đề bài thực hành viết</span>
        </div>
        <h3 className="mt-2 text-base font-extrabold text-[#213a61] sm:text-lg">
          {content.prompt || 'Hãy viết câu trả lời cho tình huống dưới đây.'}
        </h3>

        {content.rubric && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowRubric((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800"
            >
              <Icon name={showRubric ? 'expand_less' : 'expand_more'} className="text-sm" />
              <span>{showRubric ? 'Ẩn tiêu chí chấm điểm' : 'Xem tiêu chí chấm điểm'}</span>
            </button>
            {showRubric && (
              <div className="mt-2 rounded-xl bg-sky-50/70 p-4 text-xs leading-relaxed text-sky-950">
                <p className="font-bold text-sky-900">Tiêu chí đánh giá:</p>
                <p className="mt-1">{content.rubric}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Textarea */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <label htmlFor="writing-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Bài viết của bạn
        </label>
        <textarea
          id="writing-input"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
          placeholder="Nhập nội dung bài làm của bạn tại đây (tối thiểu 20 ký tự)..."
          className="mt-3 w-full rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>{wordCount} từ</span>
            <span>·</span>
            <span className={charCount < 20 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {charCount} / 20 ký tự tối thiểu
            </span>
          </div>
          {charCount > 0 && charCount < 20 && (
            <span className="text-amber-600">Cần thêm {20 - charCount} ký tự nữa</span>
          )}
        </div>
      </div>

      {/* Submit button & AI loading banner */}
      <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isSubmitting ? (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>AI đang chấm bài và phân tích nhận xét... (có thể mất 10-20 giây)</span>
          </div>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Đang chấm bài...</span>
            </>
          ) : (
            <>
              <Icon name="auto_awesome" className="text-base" />
              <span>Nộp bài & Chấm AI</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
