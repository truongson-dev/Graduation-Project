<?php

namespace App\Services\Learning;

use App\Enums\LessonProgressStatus;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Section;
use App\Models\User;
use App\Models\UserGamification;
use App\Models\UserLessonProgress;

class ProgressService
{
    /**
     * Initialize gamification and unlock the first lesson for the user if not yet initialized.
     */
    public function initializeForUser(User $user, LearningPath $path): void
    {
        UserGamification::firstOrCreate(
            ['user_id' => $user->id],
            [
                'total_xp' => 0,
                'current_streak' => 0,
                'longest_streak' => 0,
                'lives_count' => 5,
                'tournament_tier' => 'Đồng',
            ]
        );

        $firstSection = $path->sections()->orderBy('sort_order')->first();
        if ($firstSection) {
            $firstLesson = $firstSection->lessons()->orderBy('sort_order')->first();
            if ($firstLesson) {
                UserLessonProgress::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'lesson_id' => $firstLesson->id,
                    ],
                    [
                        'status' => LessonProgressStatus::Unlocked,
                    ]
                );
            }
        }
    }

    /**
     * Calculate comprehensive learning path progress and sections state.
     *
     * @return array<string, mixed>
     */
    public function getPathProgress(User $user, LearningPath $path): array
    {
        $this->initializeForUser($user, $path);

        $sections = $path->sections()->with(['lessons'])->orderBy('sort_order')->get();
        $userProgress = UserLessonProgress::where('user_id', $user->id)
            ->whereIn('lesson_id', $sections->flatMap->lessons->pluck('id'))
            ->get()
            ->keyBy('lesson_id');

        $sectionResults = [];
        $totalLessons = 0;
        $completedLessons = 0;
        $completedSections = 0;
        $foundCurrent = false;
        $nextLesson = null;

        foreach ($sections as $index => $section) {
            $secLessons = $section->lessons;
            $secTotal = $secLessons->count();
            $secPassed = 0;

            foreach ($secLessons as $lesson) {
                $totalLessons++;
                $progress = $userProgress->get($lesson->id);
                $isPassed = $progress && $progress->status === LessonProgressStatus::Passed;

                if ($isPassed) {
                    $secPassed++;
                    $completedLessons++;
                } elseif (! $nextLesson && $progress && $progress->status !== LessonProgressStatus::Locked) {
                    $nextLesson = [
                        'id' => $lesson->id,
                        'title' => $lesson->title,
                        'section' => $section->title,
                    ];
                }
            }

            // Derive section status
            if ($secTotal > 0 && $secPassed === $secTotal) {
                $status = 'complete';
                $completedSections++;
            } elseif (! $foundCurrent) {
                $status = 'current';
                $foundCurrent = true;
            } else {
                $status = 'locked';
            }

            $sectionResults[] = [
                'id' => $section->id,
                'title' => $section->title,
                'subtitle' => $section->subtitle,
                'icon' => $section->icon,
                'sort_order' => $section->sort_order,
                'lessons_count' => $secTotal,
                'status' => $status,
                'progress' => [
                    'completed' => $secPassed,
                    'total' => $secTotal,
                ],
            ];
        }

        $percentage = $totalLessons > 0 ? (int) round(($completedLessons / $totalLessons) * 100) : 0;

        return [
            'id' => $path->id,
            'title' => $path->title,
            'slug' => $path->slug,
            'description' => $path->description,
            'sections' => $sectionResults,
            'summary' => [
                'completed_sections' => $completedSections,
                'total_sections' => $sections->count(),
                'completed_lessons' => $completedLessons,
                'total_lessons' => $totalLessons,
                'percentage' => $percentage,
                'next_lesson' => $nextLesson,
            ],
        ];
    }

    /**
     * Unlock the next lesson linearly after the given lesson is passed.
     */
    public function unlockNext(User $user, Lesson $completedLesson): ?Lesson
    {
        // 1. Try to find the next lesson in the same section
        $nextLesson = Lesson::where('section_id', $completedLesson->section_id)
            ->where('sort_order', '>', $completedLesson->sort_order)
            ->orderBy('sort_order')
            ->first();

        // 2. If no more lessons in current section, find first lesson of the next section
        if (! $nextLesson) {
            $currentSection = $completedLesson->section;
            $nextSection = Section::where('learning_path_id', $currentSection->learning_path_id)
                ->where('sort_order', '>', $currentSection->sort_order)
                ->orderBy('sort_order')
                ->first();

            if ($nextSection) {
                $nextLesson = Lesson::where('section_id', $nextSection->id)
                    ->orderBy('sort_order')
                    ->first();
            }
        }

        if ($nextLesson) {
            UserLessonProgress::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'lesson_id' => $nextLesson->id,
                ],
                [
                    'status' => LessonProgressStatus::Unlocked,
                ]
            );
        }

        return $nextLesson;
    }
}
