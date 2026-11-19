import React from 'react';
import type { LessonContent } from '../types';
import { AppIcon as Icon } from '@/components/layout/AppIcon';

interface TheoryContentProps {
  content: LessonContent;
  onComplete: () => void;
  isSubmitting?: boolean;
}

export const TheoryContent: React.FC<TheoryContentProps> = ({
  content,
  onComplete,
  isSubmitting = false,
}) => {
  const markdownLines = (content.markdown || '').split('\n');

  return (
    <div className="space-y-6">
      <div className="prose prose-slate max-w-none rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {markdownLines.map((line, idx) => {
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="mt-4 text-xl font-extrabold text-[#213a61]">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="mt-3 text-base font-bold text-slate-800">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-sm leading-relaxed text-slate-600">
                {line.replace('- ', '')}
              </li>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <p key={idx} className="ml-2 text-sm leading-relaxed text-slate-700">
                <strong>{line.split(':')[0]}:</strong>
                {line.includes(':') ? line.substring(line.indexOf(':') + 1) : ''}
              </p>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-2" />;
          }
          return (
            <p key={idx} className="text-sm leading-relaxed text-slate-600">
              {line}
            </p>
          );
        })}

        {content.images && content.images.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {content.images.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={img.alt}
                className="rounded-xl border border-slate-200 object-cover shadow-sm"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onComplete}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Đang lưu tiến trình...</span>
            </>
          ) : (
            <>
              <Icon name="check_circle" className="text-lg" />
              <span>Đã hiểu & Hoàn thành</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
