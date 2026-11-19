<?php

use App\Ai\Agents\SoftSkillCoach;
use App\Models\User;
use Laravel\Ai\Classification;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Responses\Data\BooleanAnswer;
use Laravel\Ai\Responses\Data\ChoiceAnswer;

beforeEach(function () {
    config([
        'ai.providers.gemini.key' => 'test-key',
        'ai.preflight.enabled' => true,
    ]);

    Classification::fake(fn () => [
        'is_prompt_injection' => new BooleanAnswer(0.05),
        'topic_scope' => new ChoiceAnswer('soft_skill', ['soft_skill' => 0.95, 'restricted_professional' => 0.05], 0.95),
    ]);
});

it('rejects unauthenticated requests', function () {
    $this->postJson('/api/v1/ai/chat', ['message' => 'Chào'])
        ->assertUnauthorized();
});

it('validates the message', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/chat', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('message');
});

it('returns 503 when the provider is not configured', function () {
    config(['ai.providers.gemini.key' => null]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/chat', ['message' => 'Chào'])
        ->assertStatus(503);
});

it('streams a coach reply and persists the conversation', function () {
    $user = User::factory()->create();
    SoftSkillCoach::fake(['Xin chào bạn!']);

    $response = $this->actingAs($user)->post(
        '/api/v1/ai/chat',
        ['message' => 'Làm sao để tự tin thuyết trình?'],
        ['Accept' => 'text/event-stream'],
    );

    $response->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/event-stream');

    $body = $response->streamedContent();

    expect($body)
        ->toContain('"type":"meta"')
        ->toContain('"type":"text_delta"')
        ->toContain('"type":"done"');

    $this->assertDatabaseCount('agent_conversations', 1);
    $this->assertDatabaseCount('agent_conversation_messages', 2);
});

it('continues an existing conversation without creating another', function () {
    $user = User::factory()->create();
    SoftSkillCoach::fake(['Câu trả lời một', 'Câu trả lời hai']);

    $first = $this->actingAs($user)->post(
        '/api/v1/ai/chat',
        ['message' => 'Câu hỏi một'],
        ['Accept' => 'text/event-stream'],
    );

    preg_match('/"type":"meta","conversation_id":"([^"]+)"/', $first->streamedContent(), $matches);

    $conversationId = $matches[1] ?? null;

    expect($conversationId)->toBeString()->not->toBeEmpty();

    $second = $this->actingAs($user)->post(
        '/api/v1/ai/chat',
        ['message' => 'Câu hỏi hai', 'conversation_id' => $conversationId],
        ['Accept' => 'text/event-stream'],
    );

    $second->assertOk();

    expect($second->streamedContent())
        ->toContain('"type":"done"')
        ->toContain($conversationId);

    $this->assertDatabaseCount('agent_conversations', 1);
});

it('rejects a conversation owned by another user', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();

    $conversationId = app(ConversationStore::class)->storeConversation(
        Conversation::participantType($owner),
        Conversation::participantKey($owner),
        'Hội thoại của người khác',
    );

    $this->actingAs($intruder)
        ->postJson('/api/v1/ai/chat', ['message' => 'Chào', 'conversation_id' => $conversationId])
        ->assertNotFound();
});

it('returns 404 for an unknown conversation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/chat', [
            'message' => 'Chào',
            'conversation_id' => '0190e2a4-1111-7000-8000-000000000000',
        ])
        ->assertNotFound();
});

it('rate limits the chat endpoint per user', function () {
    $user = User::factory()->create();
    SoftSkillCoach::fake(array_fill(0, 11, 'ok'));

    foreach (range(1, 10) as $ignored) {
        $this->actingAs($user)->post(
            '/api/v1/ai/chat',
            ['message' => 'Chào'],
            ['Accept' => 'text/event-stream'],
        )->assertOk();
    }

    $this->actingAs($user)
        ->postJson('/api/v1/ai/chat', ['message' => 'Chào'])
        ->assertStatus(429);
});

it('returns a safe SSE refusal for out-of-scope questions without calling SoftSkillCoach', function () {
    $user = User::factory()->create();

    Classification::fake([[
        'is_prompt_injection' => new BooleanAnswer(0.05),
        'topic_scope' => new ChoiceAnswer(
            'restricted_professional',
            ['soft_skill' => 0.04, 'restricted_professional' => 0.96],
            0.96,
        ),
    ]]);

    SoftSkillCoach::fake(['Should not be called']);

    $response = $this->actingAs($user)->post(
        '/api/v1/ai/chat',
        ['message' => 'Tôi nên mua cổ phiếu nào và uống thuốc gì để khỏi đau đầu?'],
        ['Accept' => 'text/event-stream'],
    );

    $response->assertOk();

    $body = $response->streamedContent();

    expect($body)
        ->toContain('"type":"meta"')
        ->toContain('"type":"text_delta"')
        ->toContain('"type":"done"')
        ->toContain('y tế, pháp lý hay tài chính cá nhân');

    SoftSkillCoach::assertNeverPrompted();
});

it('fails open to SoftSkillCoach when preflight classification throws', function () {
    $user = User::factory()->create();

    Classification::fake(fn () => throw new RuntimeException('Decisions API timeout'));
    SoftSkillCoach::fake(['Chào bạn, hãy chia sẻ thêm nhé!']);

    $response = $this->actingAs($user)->post(
        '/api/v1/ai/chat',
        ['message' => 'Làm sao để giữ bình tĩnh khi phản biện?'],
        ['Accept' => 'text/event-stream'],
    );

    $response->assertOk();

    expect($response->streamedContent())
        ->toContain('"type":"text_delta"')
        ->toContain('"type":"done"');

    SoftSkillCoach::assertPrompted('Làm sao để giữ bình tĩnh khi phản biện?');
});
