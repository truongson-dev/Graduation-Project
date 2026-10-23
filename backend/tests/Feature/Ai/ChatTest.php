<?php

use App\Ai\Agents\SoftSkillCoach;
use App\Models\User;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Models\Conversation;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
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
