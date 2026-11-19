import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import { useLessonQuery } from '../api/useLesson';
import { useLessonAttemptMutation } from '../api/useLessonAttempt';
import { useGamificationQuery } from '../api/useGamification';
import { TheoryContent } from '../components/TheoryContent';
import { QuizContent } from '../components/QuizContent';
import { WritingContent } from '../components/WritingContent';
import { LessonResultModal } from '../components/LessonResultModal';
import { GamificationSidebar } from '../components/GamificationSidebar';
import type { AttemptResult } from '../types';

export const LessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: lesson, isLoading, error } = useLessonQuery(id);
  const { data: gamification } = useGamificationQuery();
  const attemptMutation = useLessonAttemptMutation(id);

  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);

  const handleTheoryComplete = () => {
    attemptMutation.mutate(
      { completed: true },
      {
        onSuccess: (data) => setAttemptResult(data),
      }
    );
  };

  const handleQuizSubmit = (answers: number[]) => {
    attemptMutation.mutate(
      { answers },
      {
        onSuccess: (data) => setAttemptResult(data),
      }
    );
  };

  const handleWritingSubmit = (content: string) => {
    attemptMutation.mutate(
      { content },
      {
        onSuccess: (data) => setAttemptResult(data),
      }
    );
  };

  const handleRetry = () => {
    setAttemptResult(null);
  };

  const handleNextLesson = () => {
    if (attemptResult?.next_lesson?.id) {
      setAttemptResult(null);
      navigate(`/learning/lesson/${attemptResult.next_lesson.id}`);
    } else {
      navigate('/learning-path');
    }
  };

  const handleBackToPath = () => {
    navigate('/learning-path');
  };

  if (isLoading) {
    return (
      <StudentPageLayout active="/learning-path" title="Đang tải bài học...">
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm font-semibold">Đang chuẩn bị nội dung bài học...</span>
          </div>
        </div>
      </StudentPageLayout>
    );
  }

  if (error || !lesson) {
    return (
      <StudentPageLayout active="/learning-path" title="Không tìm thấy bài học">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <Icon name="error" className="mx-auto text-3xl text-rose-500" />
          <h2 className="mt-2 text-base font-bold text-rose-900">
            Không thể tải bài học hoặc bài học đang bị khóa
          </h2>
          <p className="mt-1 text-xs text-rose-700">
            Vui lòng hoàn thành các bài học trước để mở khóa bài học này.
          </p>
          <button
            type="button"
            onClick={handleBackToPath}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Icon name="arrow_back" className="text-sm" />
            <span>Quay lại lộ trình</span>
          </button>
        </div>
      </StudentPageLayout>
    );
  }

  const isOutOfLives = (gamification?.lives_count ?? 5) <= 0;

  return (
    <StudentPageLayout active="/learning-path" title={lesson.title} maxWidth="max-w-[1420px]">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          {/* Top navigation & metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/learning-path"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              <Icon name="arrow_back" className="text-sm" />
              <span>Quay về lộ trình học</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                {lesson.section.title}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                +{lesson.xp_reward} XP
              </span>
            </div>
          </div>

          {/* Lesson Header Banner */}
          <div className="rounded-[22px] bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-md">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-100">
              <Icon
                name={
                  lesson.type === 'theory'
                    ? 'menu_book'
                    : lesson.type === 'quiz'
                    ? 'quiz'
                    : 'edit_note'
                }
                className="text-sm"
              />
              <span>
                {lesson.type === 'theory'
                  ? 'BÀI ĐỌC LÝ THUYẾT'
                  : lesson.type === 'quiz'
                  ? 'BÀI TRẮC NGHIỆM'
                  : 'BÀI THỰC HÀNH VIẾT'}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{lesson.title}</h1>
            <p className="mt-1 text-xs text-blue-50">
              {lesson.type === 'theory'
                ? 'Đọc kỹ các nguyên tắc và ví dụ dưới đây để nắm vững kỹ năng.'
                : lesson.type === 'quiz'
                ? `Cần đạt tối thiểu ${lesson.pass_threshold}% điểm để qua bài.`
                : 'Bài làm sẽ được AI Giảng Viên chấm điểm và nhận xét chi tiết.'}
            </p>
          </div>

          {/* Out of lives warning */}
          {isOutOfLives && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <Icon name="heart_broken" className="text-base" />
                <span>Bạn đã hết tim</span>
              </div>
              <p className="mt-1">
                Bạn cần đợi thời gian hồi tim để làm bài tập trắc nghiệm hoặc viết.
              </p>
            </div>
          )}

          {/* Render content by lesson type */}
          {lesson.type === 'theory' && (
            <TheoryContent
              content={lesson.content}
              onComplete={handleTheoryComplete}
              isSubmitting={attemptMutation.isPending}
            />
          )}

          {lesson.type === 'quiz' && (
            <QuizContent
              questions={lesson.content.questions || []}
              onSubmit={handleQuizSubmit}
              isSubmitting={attemptMutation.isPending}
            />
          )}

          {lesson.type === 'writing' && (
            <WritingContent
              content={lesson.content}
              onSubmit={handleWritingSubmit}
              isSubmitting={attemptMutation.isPending}
            />
          )}
        </main>

        {/* Sidebar */}
        <GamificationSidebar />
      </div>

      {/* Result Modal */}
      {attemptResult && (
        <LessonResultModal
          result={attemptResult}
          lessonTitle={lesson.title}
          onNextLesson={attemptResult.next_lesson ? handleNextLesson : undefined}
          onRetry={handleRetry}
          onBackToPath={handleBackToPath}
        />
      )}
    </StudentPageLayout>
  );
};
