<?php

use App\Ai\Agents\PresentationEvaluator;
use App\Models\User;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
});

it('rejects unauthenticated requests', function () {
    $this->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnauthorized();
});

it('validates required fields for presentation evaluation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slide_content', 'transcript', 'duration', 'words_per_minute']);
});

it('evaluates presentation and returns structured 4-pillar feedback', function () {
    $user = User::factory()->create();

    PresentationEvaluator::fake([[
        'overall_score' => 88,
        'is_reading_slides' => false,
        'slide_coverage_score' => 85,
        'elaboration_quality' => 'Diễn giải rất tốt, có ví dụ thực tế.',
        'voice_feedback' => 'Tốc độ 120 từ/phút rất chuẩn, ít từ đệm.',
        'body_language_feedback' => 'Ánh mắt tự tin, dáng đứng vững vàng.',
        'strengths' => ['Bố cục rõ ràng', 'Không phụ thuộc slide'],
        'improvements' => ['Nói to hơn ở phần kết'],
        'actionable_tips' => ['Tập trung nhìn đều 3 hướng người nghe'],
    ]]);

    $response = $this->actingAs($user)->postJson('/api/v1/ai/presentation/evaluate', [
        'slide_content' => 'Slide 1: Tổng quan dự án AI. Mục tiêu hỗ trợ sinh viên.',
        'transcript' => 'Kính chào thầy cô, hôm nay em xin giới thiệu dự án AI giúp sinh viên nâng cao kỹ năng.',
        'duration' => '04:30',
        'words_per_minute' => 120,
        'fillers_count' => 3,
        'eye_contact_percent' => 82,
        'posture_score' => 88,
        'language' => 'vi',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.overall_score', 88)
        ->assertJsonPath('data.is_reading_slides', false)
        ->assertJsonPath('data.slide_coverage_score', 85)
        ->assertJsonStructure([
            'data' => [
                'overall_score',
                'is_reading_slides',
                'slide_coverage_score',
                'elaboration_quality',
                'voice_feedback',
                'body_language_feedback',
                'strengths',
                'improvements',
                'actionable_tips',
            ],
        ]);
});
