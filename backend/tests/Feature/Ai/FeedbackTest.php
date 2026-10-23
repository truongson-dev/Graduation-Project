<?php

use App\Ai\Agents\AnswerGrader;
use App\Models\User;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
});

it('rejects unauthenticated requests', function () {
    $this->postJson('/api/v1/ai/feedback', [])
        ->assertUnauthorized();
});

it('validates the grading payload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/feedback', ['skill' => 'Giao tiếp'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['question', 'answer']);
});

it('returns 503 when the provider is not configured', function () {
    config(['ai.providers.gemini.key' => null]);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/ai/feedback', [
            'skill' => 'Giao tiếp',
            'question' => 'Bạn xử lý thế nào khi đồng nghiệp không lắng nghe?',
            'answer' => 'Mình sẽ đặt câu hỏi mở để hiểu lý do.',
        ])
        ->assertStatus(503);
});

it('returns structured feedback for an answer', function () {
    AnswerGrader::fake([[
        'score' => 85,
        'summary' => 'Câu trả lời rõ ràng và có hướng hành động.',
        'strengths' => ['Đặt câu hỏi mở để tìm hiểu nguyên nhân.'],
        'improvements' => ['Nêu thêm kết quả mong muốn của cuộc trao đổi.'],
    ]]);

    $response = $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/ai/feedback', [
            'skill' => 'Giao tiếp',
            'question' => 'Bạn xử lý thế nào khi đồng nghiệp không lắng nghe?',
            'answer' => 'Mình sẽ đặt câu hỏi mở để hiểu lý do.',
            'context' => 'Môi trường làm việc nhóm 5 người.',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.score', 85)
        ->assertJsonPath('data.summary', 'Câu trả lời rõ ràng và có hướng hành động.')
        ->assertJsonPath('data.strengths.0', 'Đặt câu hỏi mở để tìm hiểu nguyên nhân.')
        ->assertJsonPath('data.improvements.0', 'Nêu thêm kết quả mong muốn của cuộc trao đổi.');
});

it('grades only the learner answer, never the surrounding context', function () {
    AnswerGrader::fake([[
        'score' => 40,
        'summary' => 'Câu trả lời còn chung chung.',
        'strengths' => [],
        'improvements' => ['Bổ sung ví dụ cụ thể.'],
    ]]);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/ai/feedback', [
            'skill' => 'Giao tiếp',
            'question' => 'Bạn xử lý thế nào khi đồng nghiệp không lắng nghe?',
            'answer' => 'Bỏ qua và làm việc của mình.',
        ])
        ->assertOk()
        ->assertJsonPath('data.score', 40);

    AnswerGrader::assertPrompted(function ($prompt) {
        return str_contains($prompt->prompt, 'CÂU TRẢ LỜI CỦA NGƯỜI HỌC')
            && str_contains($prompt->prompt, 'Bỏ qua và làm việc của mình.');
    });
});
