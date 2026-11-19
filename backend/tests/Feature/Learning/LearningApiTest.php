<?php

use App\Ai\Agents\AnswerGrader;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonType;
use App\Models\LearningPath;
use App\Models\User;
use App\Models\UserLessonProgress;
use Database\Seeders\LearningPathSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(LearningPathSeeder::class);
    $this->user = User::factory()->create();
});

it('requires authentication for all learning routes', function () {
    $this->getJson('/api/v1/learning/paths')->assertUnauthorized();
    $this->getJson('/api/v1/learning/paths/ky-nang-mem')->assertUnauthorized();
    $this->getJson('/api/v1/learning/sections/1')->assertUnauthorized();
    $this->getJson('/api/v1/learning/lessons/1')->assertUnauthorized();
    $this->getJson('/api/v1/learning/progress')->assertUnauthorized();
    $this->postJson('/api/v1/learning/lessons/1/attempt', [])->assertUnauthorized();
    $this->getJson('/api/v1/learning/gamification')->assertUnauthorized();
    $this->postJson('/api/v1/learning/lives/consume')->assertUnauthorized();
    $this->getJson('/api/v1/learning/leaderboard')->assertUnauthorized();
    $this->getJson('/api/v1/learning/streak')->assertUnauthorized();
});

it('lists active learning paths with summary progress', function () {
    $response = $this->actingAs($this->user)
        ->getJson('/api/v1/learning/paths')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'title',
                    'slug',
                    'description',
                    'sections_count',
                    'user_progress' => ['completed_sections', 'total_sections', 'percentage'],
                ],
            ],
        ]);

    expect($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.slug'))->toBe('ky-nang-mem');
});

it('returns full path details with 7 sections and roadmap status', function () {
    $response = $this->actingAs($this->user)
        ->getJson('/api/v1/learning/paths/ky-nang-mem')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'title',
                'slug',
                'sections' => [
                    '*' => [
                        'id',
                        'title',
                        'subtitle',
                        'icon',
                        'sort_order',
                        'lessons_count',
                        'status',
                        'progress' => ['completed', 'total'],
                    ],
                ],
                'summary' => [
                    'completed_sections',
                    'total_sections',
                    'completed_lessons',
                    'total_lessons',
                    'percentage',
                ],
            ],
        ]);

    $sections = $response->json('data.sections');
    expect($sections)->toHaveCount(7)
        ->and($sections[0]['status'])->toBe('current')
        ->and($sections[1]['status'])->toBe('locked');
});

it('returns section detail with lesson user statuses', function () {
    $path = LearningPath::where('slug', 'ky-nang-mem')->first();
    $firstSection = $path->sections()->first();

    $response = $this->actingAs($this->user)
        ->getJson("/api/v1/learning/sections/{$firstSection->id}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'title',
                'subtitle',
                'lessons' => [
                    '*' => [
                        'id',
                        'title',
                        'type',
                        'sort_order',
                        'pass_threshold',
                        'xp_reward',
                        'status',
                    ],
                ],
            ],
        ]);

    expect($response->json('data.lessons'))->not->toBeEmpty();
});

it('hides correct answers when fetching a quiz lesson', function () {
    $path = LearningPath::where('slug', 'ky-nang-mem')->first();
    $quizLesson = $path->sections()->first()->lessons()->where('type', LessonType::Quiz)->first();

    $response = $this->actingAs($this->user)
        ->getJson("/api/v1/learning/lessons/{$quizLesson->id}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'title',
                'type',
                'content' => [
                    'questions' => [
                        '*' => ['text', 'options'],
                    ],
                ],
            ],
        ]);

    $questions = $response->json('data.content.questions');
    foreach ($questions as $q) {
        expect($q)->not->toHaveKey('correct')
            ->and($q)->not->toHaveKey('explanation');
    }
});

it('submits a theory attempt, passes, awards XP and unlocks next lesson', function () {
    $path = LearningPath::where('slug', 'ky-nang-mem')->first();
    $theoryLesson = $path->sections()->first()->lessons()->where('type', LessonType::Theory)->first();

    // Ensure theory lesson is unlocked
    UserLessonProgress::updateOrCreate(
        ['user_id' => $this->user->id, 'lesson_id' => $theoryLesson->id],
        ['status' => LessonProgressStatus::Unlocked]
    );

    $response = $this->actingAs($this->user)
        ->postJson("/api/v1/learning/lessons/{$theoryLesson->id}/attempt", [
            'completed' => true,
        ])
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'attempt_id',
                'score',
                'passed',
                'xp_earned',
                'next_lesson',
            ],
        ]);

    expect($response->json('data.passed'))->toBeTrue()
        ->and($response->json('data.score'))->toBe(100)
        ->and($response->json('data.xp_earned'))->toBe($theoryLesson->xp_reward)
        ->and($response->json('data.next_lesson'))->not->toBeNull();

    // Check attempts index
    $attemptsResponse = $this->actingAs($this->user)
        ->getJson("/api/v1/learning/lessons/{$theoryLesson->id}/attempts")
        ->assertOk();

    expect($attemptsResponse->json('data'))->toHaveCount(1);
});

it('consumes life on lives/consume endpoint', function () {
    $response = $this->actingAs($this->user)
        ->postJson('/api/v1/learning/lives/consume')
        ->assertOk();

    expect($response->json('data.lives_count'))->toBe(4);
});

it('returns user gamification and streak profiles', function () {
    $gamification = $this->actingAs($this->user)
        ->getJson('/api/v1/learning/gamification')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'total_xp',
                'current_streak',
                'longest_streak',
                'lives_count',
                'lives_max',
                'tournament_tier',
            ],
        ]);

    expect($gamification->json('data.lives_count'))->toBe(5);

    $streak = $this->actingAs($this->user)
        ->getJson('/api/v1/learning/streak')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'current_streak',
                'longest_streak',
                'this_week',
                'completed_today',
            ],
        ]);

    expect($streak->json('data.this_week'))->toHaveCount(7);

    $leaderboard = $this->actingAs($this->user)
        ->getJson('/api/v1/learning/leaderboard')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'tier',
                'week_start',
                'rankings',
                'user_rank',
                'user_xp_this_week',
            ],
        ]);

    expect($leaderboard->json('data.tier'))->toBe('Đồng');
});
