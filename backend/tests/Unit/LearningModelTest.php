<?php

use App\Enums\LessonProgressStatus;
use App\Enums\LessonType;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Section;
use App\Models\User;
use App\Models\UserDailyStreak;
use App\Models\UserGamification;
use App\Models\UserLessonAttempt;
use App\Models\UserLessonProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates learning path with sections and lessons', function () {
    $path = LearningPath::create([
        'title' => 'Kỹ năng mềm',
        'slug' => 'ky-nang-mem',
        'description' => 'Lộ trình phát triển kỹ năng mềm toàn diện',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    expect($path->id)->not->toBeNull()
        ->and($path->is_active)->toBeTrue();

    $section = $path->sections()->create([
        'title' => 'Giao tiếp tự tin',
        'subtitle' => 'Kỹ năng 1',
        'icon' => 'chat_bubble',
        'sort_order' => 1,
    ]);

    expect($section->learning_path_id)->toBe($path->id)
        ->and($section->learningPath->id)->toBe($path->id);

    $lesson = $section->lessons()->create([
        'title' => 'Diễn đạt ý tưởng rõ ràng',
        'type' => LessonType::Theory,
        'sort_order' => 1,
        'content_json' => ['markdown' => '# Lý thuyết giao tiếp'],
        'pass_threshold' => 0,
        'xp_reward' => 15,
    ]);

    expect($lesson->section_id)->toBe($section->id)
        ->and($lesson->type)->toBe(LessonType::Theory)
        ->and($lesson->content_json)->toBe(['markdown' => '# Lý thuyết giao tiếp'])
        ->and($section->lessons)->toHaveCount(1);
});

it('tracks user progress, attempts, gamification, and streaks', function () {
    $user = User::factory()->create();

    $path = LearningPath::create([
        'title' => 'Kỹ năng mềm',
        'slug' => 'ky-nang-mem',
    ]);

    $section = $path->sections()->create([
        'title' => 'Phần 1',
        'sort_order' => 1,
    ]);

    $lesson = $section->lessons()->create([
        'title' => 'Bài 1',
        'type' => LessonType::Quiz,
        'content_json' => ['questions' => []],
    ]);

    $progress = UserLessonProgress::create([
        'user_id' => $user->id,
        'lesson_id' => $lesson->id,
        'status' => LessonProgressStatus::Unlocked,
        'best_score' => 85,
        'xp_earned' => 15,
        'completed_at' => now(),
    ]);

    expect($progress->status)->toBe(LessonProgressStatus::Unlocked)
        ->and($progress->user->id)->toBe($user->id)
        ->and($progress->lesson->id)->toBe($lesson->id);

    $attempt = UserLessonAttempt::create([
        'user_id' => $user->id,
        'lesson_id' => $lesson->id,
        'attempt_number' => 1,
        'answers_json' => [1, 2, 0],
        'score' => 85,
        'passed' => true,
    ]);

    expect($attempt->passed)->toBeTrue()
        ->and($attempt->answers_json)->toBe([1, 2, 0]);

    $gamification = UserGamification::create([
        'user_id' => $user->id,
        'total_xp' => 150,
        'current_streak' => 3,
        'longest_streak' => 5,
        'lives_count' => 5,
    ]);

    expect($user->gamification->total_xp)->toBe(150);

    $streak = UserDailyStreak::create([
        'user_id' => $user->id,
        'date' => now()->toDateString(),
        'xp_earned' => 50,
        'lessons_completed' => 2,
    ]);

    expect($user->dailyStreaks)->toHaveCount(1)
        ->and($streak->user->id)->toBe($user->id);
});

it('seeds the full soft skills learning path with 7 sections and 25 lessons', function () {
    $this->seed(Database\Seeders\LearningPathSeeder::class);

    $path = LearningPath::where('slug', 'ky-nang-mem')->first();
    expect($path)->not->toBeNull()
        ->and($path->sections)->toHaveCount(7);

    $totalLessons = Lesson::count();
    expect($totalLessons)->toBe(25);
});
