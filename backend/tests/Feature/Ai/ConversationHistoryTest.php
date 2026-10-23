<?php

use App\Ai\Agents\SoftSkillCoach;
use App\Models\User;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Messages\UserMessage;
use Laravel\Ai\Models\Conversation;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
});

it('lists only the authenticated user conversations', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $store = app(ConversationStore::class);

    $store->storeConversation(Conversation::participantType($user), Conversation::participantKey($user), 'Của tôi');
    $store->storeConversation(Conversation::participantType($other), Conversation::participantKey($other), 'Của người khác');

    $response = $this->actingAs($user)->getJson('/api/v1/ai/conversations');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Của tôi')
        ->assertJsonStructure(['data' => [['id', 'title', 'created_at', 'updated_at']], 'meta' => ['next_cursor', 'prev_cursor', 'per_page']]);
});

it('returns the messages of a conversation', function () {
    $user = User::factory()->create();
    $store = app(ConversationStore::class);

    $conversationId = $store->storeConversation(
        Conversation::participantType($user),
        Conversation::participantKey($user),
        'Hội thoại',
    );

    $store->storeUserMessage(
        $conversationId,
        Conversation::participantType($user),
        Conversation::participantKey($user),
        SoftSkillCoach::class,
        new UserMessage('Câu hỏi đầu tiên'),
    );

    $response = $this->actingAs($user)
        ->getJson("/api/v1/ai/conversations/{$conversationId}/messages");

    $response->assertOk()
        ->assertJsonPath('data.0.role', 'user')
        ->assertJsonPath('data.0.content', 'Câu hỏi đầu tiên')
        ->assertJsonPath('data.0.status', 'completed')
        ->assertJsonStructure(['data' => [['id', 'role', 'content', 'status', 'created_at']], 'meta' => ['next_cursor', 'prev_cursor', 'per_page']]);
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
        ->getJson("/api/v1/ai/conversations/{$conversationId}/messages")
        ->assertNotFound();
});

it('returns 404 for an unknown conversation', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/ai/conversations/0190e2a4-2222-7000-8000-000000000000/messages')
        ->assertNotFound();
});
