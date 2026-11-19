import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AppIcon as Icon } from '@/components/layout/AppIcon';
import { useLearningPathQuery, useSectionQuery } from '../api/useLearningPath';
import { GamificationSidebar } from '../components/GamificationSidebar';
import type { SectionSummary } from '../types';

function buildLessonPath(count: number) {
  if (count < 1) return '';
  let path = 'M 270 65';
  for (let index = 1; index < count; index += 1) {
    const previousX = (index - 1) % 2 === 0 ? 270 : 160;
    const nextX = index % 2 === 0 ? 270 : 160;
    const previousY = 65 + (index - 1) * 132;
    const nextY = 65 + index * 132;
    const midY = (previousY + nextY) / 2;
    path += ` C ${previousX} ${midY}, ${nextX} ${midY}, ${nextX} ${nextY}`;
  }
  return path;
}

export const LearningPathPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: pathData,
    isLoading: isPathLoading,
    isError: isPathError,
    error: pathError,
    refetch: refetchPath,
  } = useLearningPathQuery('ky-nang-mem');

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [showLessons, setShowLessons] = useState(false);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  const { data: sectionDetail, isLoading: isSectionLoading } = useSectionQuery(
    selectedSectionId ?? undefined
  );

  const sections = pathData?.sections || [];
  const activeSectionSummary: SectionSummary | undefined =
    sections.find((s) => s.id === selectedSectionId) || sections[0];

  const lessons = sectionDetail?.lessons || [];
  const lessonCount = lessons.length;
  const currentLessonIndex = lessons.findIndex((l) => l.status === 'unlocked' || l.status === 'in_progress');
  const effectiveCurrentIndex = currentLessonIndex === -1 ? (activeSectionSummary?.status === 'complete' ? lessonCount : 0) : currentLessonIndex;

  const lessonMapHeight = Math.max(500, 130 + lessonCount * 132);
  const lessonPath = buildLessonPath(lessonCount);
  const lessonProgressPath = buildLessonPath(
    activeSectionSummary?.status === 'complete' ? lessonCount : Math.max(0, effectiveCurrentIndex + 1)
  );

  const handleOpenSection = (section: SectionSummary) => {
    setSelectedSectionId(section.id);
    setSelectedLessonIndex(0);
    setShowLessons(true);
  };

  const handleStartLesson = (lessonId: number) => {
    navigate(`/learning/lesson/${lessonId}`);
  };

  return (
    <StudentPageLayout active="/learning-path" title="Lộ trình học" maxWidth="max-w-[1420px]">
      {/* Top Banner */}
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-24 h-64 w-64 rounded-full border-[30px] border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 right-1/3 h-48 w-48 rounded-full border-[24px] border-white/10"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-100">
              LỘ TRÌNH KỸ NĂNG MỀM
            </p>
            <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
              Mỗi bước nhỏ, thêm một kỹ năng mới
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-blue-50 sm:text-sm">
              Mỗi phần gồm chuỗi bài học lý thuyết, trắc nghiệm và thực hành viết giúp bạn tự tin hơn.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Icon name="route" className="text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-blue-100">TIẾN ĐỘ HIỆN TẠI</p>
              <p className="text-lg font-extrabold">
                {pathData?.summary?.completed_sections ?? 0} / {pathData?.summary?.total_sections ?? 7}{' '}
                <span className="text-xs font-semibold text-blue-100">phần</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Roadmap Area */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(26,54,93,.06)] sm:p-5">
          {isPathLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-xs font-semibold">Đang tải lộ trình học...</span>
              </div>
            </div>
          ) : isPathError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Icon name="error" className="mb-2 text-4xl text-rose-500" />
              <p className="text-sm font-bold text-slate-700">Không thể tải lộ trình học</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                {(pathError as Error)?.message || 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.'}
              </p>
              <button
                type="button"
                onClick={() => refetchPath()}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                Thử lại
              </button>
            </div>
          ) : showLessons ? (
            <>
              {/* Header inside Section */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowLessons(false)}
                    className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <Icon name="arrow_back" className="text-sm" />
                    <span>Tất cả các phần</span>
                  </button>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Phần {activeSectionSummary?.sort_order ?? 1} · {activeSectionSummary?.subtitle}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#213a61]">
                    {activeSectionSummary?.title}
                  </h2>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  {lessonCount} bài luyện tập
                </span>
              </div>

              {/* Lesson Roadmap Map */}
              {isSectionLoading ? (
                <div className="flex h-64 items-center justify-center text-slate-400">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : (
                <div
                  className="mt-4 overflow-hidden rounded-xl bg-[#fbfcff]"
                  aria-label={`Lộ trình bài luyện tập: ${activeSectionSummary?.title}`}
                >
                  <div className="relative mx-auto w-full max-w-[520px]" style={{ height: lessonMapHeight }}>
                    <svg
                      aria-hidden="true"
                      viewBox={`0 0 430 ${lessonMapHeight}`}
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <path
                        d={lessonPath}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={lessonProgressPath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {lessons.map((lesson, index) => {
                      const complete = lesson.status === 'passed';
                      const current = lesson.status === 'unlocked' || lesson.status === 'in_progress';
                      const locked = lesson.status === 'locked';

                      const x = index % 2 === 0 ? 270 : 160;
                      const y = 65 + index * 132;
                      const selected = selectedLessonIndex === index;
                      const labelLeft = x > 215 ? '5%' : '55%';
                      const startLeft = x > 215 ? '27%' : '51%';

                      return (
                        <div key={lesson.id}>
                          {/* Node Button */}
                          <div
                            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${(x / 430) * 100}%`, top: `${y}px` }}
                          >
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => setSelectedLessonIndex(index)}
                              aria-pressed={selected}
                              aria-label={`${lesson.title}${locked ? ', chưa mở khóa' : ''}`}
                              className={`relative flex h-12 w-12 items-center justify-center rounded-full border-4 shadow-md transition ${
                                complete
                                  ? 'border-white bg-gradient-to-br from-sky-400 to-blue-600 text-white'
                                  : current
                                  ? 'border-white bg-blue-700 text-white ring-4 ring-blue-100'
                                  : 'border-slate-100 bg-slate-200 text-slate-400'
                              } ${selected ? 'ring-4 ring-blue-100' : ''} ${
                                locked
                                  ? 'cursor-not-allowed'
                                  : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
                              }`}
                            >
                              <Icon
                                name={
                                  complete
                                    ? 'check'
                                    : locked
                                    ? 'lock'
                                    : lesson.type === 'theory'
                                    ? 'menu_book'
                                    : lesson.type === 'quiz'
                                    ? 'quiz'
                                    : 'edit_note'
                                }
                                className="text-xl"
                              />
                            </button>
                          </div>

                          {/* Node Title Card */}
                          <div
                            className="absolute z-10 w-[42%] max-w-[210px] -translate-y-1/2"
                            style={{ left: labelLeft, top: `${y}px` }}
                          >
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => setSelectedLessonIndex(index)}
                              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                                selected
                                  ? 'border-blue-200 bg-blue-50 shadow-sm'
                                  : 'border-slate-100 bg-white'
                              } ${locked ? 'cursor-not-allowed opacity-55' : 'hover:border-blue-200 hover:bg-blue-50'}`}
                            >
                              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                BÀI {index + 1}
                                {complete
                                  ? ' · HOÀN THÀNH'
                                  : current
                                  ? ' · ĐANG HỌC'
                                  : ' · CHƯA MỞ'}
                              </span>
                              <span className="mt-0.5 block text-xs font-bold leading-snug text-[#213a61]">
                                {lesson.title}
                              </span>
                            </button>
                          </div>

                          {/* Floating Start/Review Action Button */}
                          {selected && !locked && (
                            <div
                              className="absolute z-20 -translate-y-1/2"
                              style={{ left: startLeft, top: `${y - 39}px` }}
                            >
                              <button
                                type="button"
                                onClick={() => handleStartLesson(lesson.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-[10px] font-extrabold text-blue-700 shadow-lg shadow-blue-900/10 transition hover:bg-blue-50"
                              >
                                <Icon name={complete ? 'replay' : 'play_arrow'} className="text-sm" />
                                <span>{complete ? 'ÔN TẬP' : 'BẮT ĐẦU'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Section Overview List */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-[#213a61]">Lộ trình học kỹ năng</h2>
              </div>
              <div className="mt-4 space-y-3" aria-label="Các phần trong lộ trình">
                {sections.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Icon name="school" className="mx-auto mb-2 text-4xl text-slate-300" />
                    <p className="text-sm font-semibold">Chưa có phần học nào trong lộ trình này.</p>
                  </div>
                ) : (
                  sections.map((section) => {
                  const locked = section.status === 'locked';
                  return (
                    <button
                      key={section.id}
                      type="button"
                      disabled={locked}
                      onClick={() => handleOpenSection(section)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        locked
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50/70 opacity-65'
                          : 'border-blue-200 bg-blue-50/40 shadow-sm hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            locked ? 'bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'
                          }`}
                        >
                          <Icon name={locked ? 'lock' : section.icon} className="text-xl" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Phần {section.sort_order} · {section.subtitle}
                            </span>
                            <Badge
                              variant={locked ? 'secondary' : 'default'}
                              className={`px-2 py-0.5 text-[9px] font-bold ${
                                locked
                                  ? 'bg-slate-200 text-slate-500'
                                  : section.status === 'complete'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {locked
                                ? 'CHƯA MỞ KHÓA'
                                : section.status === 'complete'
                                ? 'ĐÃ HOÀN THÀNH'
                                : 'ĐANG HỌC'}
                            </Badge>
                          </span>
                          <span className="mt-1 block truncate text-sm font-extrabold text-[#213a61]">
                            {section.title}
                          </span>
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-extrabold ${
                            locked ? 'bg-slate-200 text-slate-500' : 'bg-blue-700 text-white'
                          }`}
                        >
                          {locked ? <Icon name="lock" /> : <Icon name="play_arrow" />}
                          <span>{locked ? 'ĐANG KHÓA' : 'TIẾP TỤC'}</span>
                        </span>
                      </div>
                      {!locked && (
                        <div className="mt-3 flex items-center gap-3">
                          <Progress
                            value={
                              section.progress.total > 0
                                ? (section.progress.completed / section.progress.total) * 100
                                : 0
                            }
                            className="flex-1 h-2"
                          />
                          <span className="text-[10px] font-bold text-slate-500">
                            {section.progress.completed}/{section.progress.total} bài
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            </>
          )}
        </section>

        {/* Sidebar */}
        <GamificationSidebar />
      </div>
    </StudentPageLayout>
  );
};
