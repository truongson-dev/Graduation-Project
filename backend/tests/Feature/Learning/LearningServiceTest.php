<?php

use App\Ai\Agents\AnswerGrader;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonType;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Section;
use App\Models\User;
use App\Models\UserGamification;
use App\Models\UserLessonProgress;
use App\Services\Learning\GamificationService;
use App\Services\Learning\LessonAttemptService;
use App\Services\Learning\ProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->progressService = app(ProgressService::class);
    $this->gamificationService = app(GamificationService::class);
    $this->attemptService = app(LessonAttemptService::class);
});

it('initializes user and calculates path progress with status', function () {
    $user = User::factory()->create();

    $path = LearningPath::create(['title' => 'Kỹ năng mềm', 'slug' => 'ky-nang-mem']);
    $sec1 = $path->sections()->create(['title' => 'Phần 1', 'sort_order' => 1]);
    $l1 = $sec1->lessons()->create(['title' => 'Bài 1', 'type' => LessonType::Theory, 'sort_order' => 1]);
    $l2 = $sec1->lessons()->create(['title' => 'Bài 2', 'type' => LessonType::Quiz, 'sort_order' => 2]);

    $sec2 = $path->sections()->create(['title' => 'Phần 2', 'sort_order' => 2]);
    $l3 = $sec2->lessons()->create(['title' => 'Bài 3', 'type' => LessonType::Writing, 'sort_order' => 1]);

    $progress = $this->progressService->getPathProgress($user, $path);

    expect($progress['summary']['total_lessons'])->toBe(3)
        ->and($progress['summary']['completed_lessons'])->toBe(0)
        ->and($progress['sections'][0]['status'])->toBe('current')
        ->and($progress['sections'][1]['status'])->toBe('locked');

    // First lesson must be unlocked
    $p1 = UserLessonProgress::where('user_id', $user->id)->where('lesson_id', $l1->id)->first();
    expect($p1->status)->toBe(LessonProgressStatus::Unlocked);
});

it('unlocks next lesson in same section and across sections', function () {
    $user = User::factory()->create();

    $path = LearningPath::create(['title' => 'Kỹ năng mềm', 'slug' => 'ky-nang-mem']);
    $sec1 = $path->sections()->create(['title' => 'Phần 1', 'sort_order' => 1]);
    $l1 = $sec1->lessons()->create(['title' => 'Bài 1', 'type' => LessonType::Theory, 'sort_order' => 1]);
    $l2 = $sec1->lessons()->create(['title' => 'Bài 2', 'type' => LessonType::Quiz, 'sort_order' => 2]);

    $sec2 = $path->sections()->create(['title' => 'Phần 2', 'sort_order' => 2]);
    $l3 = $sec2->lessons()->create(['title' => 'Bài 3', 'type' => LessonType::Writing, 'sort_order' => 1]);

    // Unlock next in same section
    $next1 = $this->progressService->unlockNext($user, $l1);
    expect($next1->id)->toBe($l2->id);

    $p2 = UserLessonProgress::where('user_id', $user->id)->where('lesson_id', $l2->id)->first();
    expect($p2->status)->toBe(LessonProgressStatus::Unlocked);

    // Unlock next across sections
    $next2 = $this->progressService->unlockNext($user, $l2);
    expect($next2->id)->toBe($l3->id);

    $p3 = UserLessonProgress::where('user_id', $user->id)->where('lesson_id', $l3->id)->first();
    expect($p3->status)->toBe(LessonProgressStatus::Unlocked);
});

it('handles gamification lives, consumption, and 24h refill', function () {
    $user = User::factory()->create();

    $gamification = $this->gamificationService->getGamification($user);
    expect($gamification->lives_count)->toBe(5);

    // Consume 5 lives
    for ($i = 0; $i < 5; $i++) {
        $gamification = $this->gamificationService->consumeLife($user);
    }

    expect($gamification->lives_count)->toBe(0)
        ->and($gamification->lives_refill_at)->not->toBeNull();

    // Before 24h: lives remain 0
    $this->gamificationService->checkAndRefillLives($gamification);
    expect($gamification->lives_count)->toBe(0);

    // After 24h passed
    $gamification->update(['lives_refill_at' => now()->subMinutes(1)]);
    $this->gamificationService->checkAndRefillLives($gamification);
    expect($gamification->lives_count)->toBe(5)
        ->and($gamification->lives_refill_at)->toBeNull();
});

it('awards XP and tracks streaks accurately', function () {
    $user = User::factory()->create();

    $this->gamificationService->awardXp($user, 30);
    $this->gamificationService->recordActivity($user);

    $gamification = $this->gamificationService->getGamification($user);
    expect($gamification->total_xp)->toBe(30)
        ->and($gamification->current_streak)->toBe(1);

    $streakData = $this->gamificationService->getStreakData($user);
    expect($streakData['completed_today'])->toBeTrue()
        ->and($streakData['current_streak'])->toBe(1);
});

it('grades theory, quiz, and writing lesson attempts properly', function () {
    $user = User::factory()->create();

    $path = LearningPath::create(['title' => 'Lộ trình', 'slug' => 'test-path']);
    $sec = $path->sections()->create(['title' => 'Giao tiếp', 'sort_order' => 1]);

    // 1. Theory Lesson
    $theory = $sec->lessons()->create([
        'title' => 'Lý thuyết 1',
        'type' => LessonType::Theory,
        'sort_order' => 1,
        'content_json' => ['markdown' => 'Hello'],
        'xp_reward' => 15,
    ]);

    UserLessonProgress::create([
        'user_id' => $user->id,
        'lesson_id' => $theory->id,
        'status' => LessonProgressStatus::Unlocked,
    ]);

    $result = $this->attemptService->submit($user, $theory, ['completed' => true]);
    expect($result['passed'])->toBeTrue()
        ->and($result['score'])->toBe(100)
        ->and($result['xp_earned'])->toBe(15);

    // 2. Quiz Lesson
    $quiz = $sec->lessons()->create([
        'title' => 'Trắc nghiệm 1',
        'type' => LessonType::Quiz,
        'sort_order' => 2,
        'pass_threshold' => 70,
        'xp_reward' => 20,
        'content_json' => [
            'questions' => [
                ['text' => 'Q1', 'correct' => 1],
                ['text' => 'Q2', 'correct' => 0],
            ],
        ],
    ]);

    UserLessonProgress::create([
        'user_id' => $user->id,
        'lesson_id' => $quiz->id,
        'status' => LessonProgressStatus::Unlocked,
    ]);

    // Fail quiz (score 50% < 70%)
    $failResult = $this->attemptService->submit($user, $quiz, ['answers' => [1, 1]]);
    expect($failResult['passed'])->toBeFalse()
        ->and($failResult['score'])->toBe(50);

    // Pass quiz (score 100%)
    $passResult = $this->attemptService->submit($user, $quiz, ['answers' => [1, 0]]);
    expect($passResult['passed'])->toBeTrue()
        ->and($passResult['score'])->toBe(100)
        ->and($passResult['xp_earned'])->toBe(20);

    // 3. Writing Lesson with AI check
    $writing = $sec->lessons()->create([
        'title' => 'Viết văn 1',
        'type' => LessonType::Writing,
        'sort_order' => 3,
        'pass_threshold' => 70,
        'xp_reward' => 25,
        'content_json' => [
            'prompt' => 'Viết thư cảm ơn',
            'rubric' => 'Đầy đủ',
        ],
    ]);

    UserLessonProgress::create([
        'user_id' => $user->id,
        'lesson_id' => $writing->id,
        'status' => LessonProgressStatus::Unlocked,
    ]);

    // Without key -> 503
    config(['ai.providers.gemini.key' => null]);
    expect(fn () => $this->attemptService->submit($user, $writing, ['content' => 'Sample text']))
        ->toThrow(HttpException::class);

    // With key & AnswerGrader fake -> pass
    config(['ai.providers.gemini.key' => 'test-key']);
    AnswerGrader::fake([[
        'score' => 85,
        'summary' => 'Tốt',
        'strengths' => ['Rõ ràng'],
        'improvements' => ['Cần thêm ví dụ'],
    ]]);

    $writingResult = $this->attemptService->submit($user, $writing, ['content' => 'Sample text dài hơn']);
    expect($writingResult['passed'])->toBeTrue()
        ->and($writingResult['score'])->toBe(85)
        ->and($writingResult['ai_feedback']['summary'])->toBe('Tốt');
});

it('blocks attempts if lesson is locked or user has no lives', function () {
    $user = User::factory()->create();
    $path = LearningPath::create(['title' => 'Path', 'slug' => 'p']);
    $sec = $path->sections()->create(['title' => 'S', 'sort_order' => 1]);
    $lesson = $sec->lessons()->create([
        'title' => 'L',
        'type' => LessonType::Theory,
        'sort_order' => 1,
        'content_json' => [],
    ]);

    // Locked lesson -> 403
    expect(fn () => $this->attemptService->submit($user, $lesson, ['completed' => true]))
        ->toThrow(HttpException::class);

    // 0 lives -> ValidationException
    UserLessonProgress::updateOrCreate(
        ['user_id' => $user->id, 'lesson_id' => $lesson->id],
        ['status' => LessonProgressStatus::Unlocked]
    );
    UserGamification::updateOrCreate(
        ['user_id' => $user->id],
        [
            'lives_count' => 0,
            'lives_refill_at' => now()->addHours(24),
        ]
    );

    expect(fn () => $this->attemptService->submit($user, $lesson, ['completed' => true]))
        ->toThrow(ValidationException::class);
});
