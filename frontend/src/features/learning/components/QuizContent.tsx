import React, { useState } from 'react';
import type { QuizQuestion } from '../types';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import { Progress } from '@/components/ui/progress';

interface QuizContentProps {
  questions: QuizQuestion[];
  onSubmit: (answers: number[]) => void;
  isSubmitting?: boolean;
}

export const QuizContent: React.FC<QuizContentProps> = ({
  questions,
  onSubmit,
  isSubmitting = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => new Array(questions.length).fill(-1));

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const selectedOption = answers[currentIndex];
  const isAnsweredAll = answers.every((a) => a !== -1);

  const handleSelectOption = (optionIndex: number) => {
    const nextAnswers = [...answers];
    nextAnswers[currentIndex] = optionIndex;
    setAnswers(nextAnswers);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!isAnsweredAll) return;
    onSubmit(answers);
  };

  if (!currentQuestion) {
    return <p className="text-sm text-slate-500">Chưa có câu hỏi trắc nghiệm nào.</p>;
  }

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-500">
            Câu hỏi {currentIndex + 1} / {total}
          </span>
          <span className="text-xs font-extrabold text-blue-600">
            {Math.round(((currentIndex + 1) / total) * 100)}%
          </span>
        </div>
        <Progress value={((currentIndex + 1) / total) * 100} className="mt-2.5 h-2" />
      </div>

      {/* Question Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-base font-extrabold text-[#213a61] sm:text-lg">
          {currentQuestion.text}
        </h3>

        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {optionLabels[idx] ?? idx + 1}
                </span>
                <span className="text-sm font-semibold leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation and Submit */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0 || isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="arrow_back" className="text-sm" />
          <span>Câu trước</span>
        </button>

        {currentIndex < total - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={selectedOption === -1}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>Câu tiếp theo</span>
            <Icon name="arrow_forward" className="text-sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAnsweredAll || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang nộp bài...</span>
              </>
            ) : (
              <>
                <Icon name="send" className="text-base" />
                <span>Nộp bài trắc nghiệm</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
