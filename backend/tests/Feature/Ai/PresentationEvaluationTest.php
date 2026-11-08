<?php

use App\Ai\Agents\PresentationEvaluator;
use App\Jobs\EvaluatePresentationJob;
use App\Models\PresentationSession;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
    Storage::fake('local');
    Queue::fake();
});

it('rejects unauthenticated requests to evaluate', function () {
    $this->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnauthorized();
});

it('validates required fields for presentation evaluation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['duration', 'eye_contact_percent', 'posture_score']);
});

it('rejects invalid audio file extensions', function () {
    $user = User::factory()->create();
    $invalidFile = UploadedFile::fake()->create('document.txt', 100, 'text/plain');

    $this->actingAs($user)
        ->post('/api/v1/ai/presentation/evaluate', [
            'audio' => $invalidFile,
            'duration' => '02:00',
            'eye_contact_percent' => 80,
            'posture_score' => 85,
        ], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['audio']);
});

it('accepts presentation submission, saves audio on private disk, and dispatches background job', function () {
    $user = User::factory()->create();
    $audioFile = UploadedFile::fake()->create('speech.webm', 1024, 'audio/webm');

    $response = $this->actingAs($user)->post('/api/v1/ai/presentation/evaluate', [
        'title' => 'Bài tập thực hành 1',
        'audio' => $audioFile,
        'slide_content' => 'Slide 1: Tổng quan dự án AI.',
        'duration' => '04:30',
        'eye_contact_percent' => 82,
        'posture_score' => 88,
        'language' => 'vi',
    ], ['Accept' => 'application/json']);

    $response->assertStatus(202)
        ->assertJsonPath('data.status', 'processing')
        ->assertJsonStructure([
            'message',
            'data' => ['id', 'status', 'created_at'],
        ]);

    $sessionId = $response->json('data.id');

    $this->assertDatabaseHas('presentation_sessions', [
        'id' => $sessionId,
        'user_id' => $user->id,
        'status' => 'processing',
        'duration_seconds' => 270,
    ]);

    Queue::assertPushed(EvaluatePresentationJob::class, function ($job) use ($sessionId) {
        return $job->session->id === $sessionId && $job->queue === 'presentations';
    });
});

it('allows user to retrieve session details and prohibits access to another user', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $session = PresentationSession::create([
        'user_id' => $userA->id,
        'status' => 'completed',
        'title' => 'Bài tập user A',
        'duration_seconds' => 120,
        'overall_score' => 90,
    ]);

    // User A can view own session
    $this->actingAs($userA)
        ->getJson("/api/v1/presentation/sessions/{$session->id}")
        ->assertOk()
        ->assertJsonPath('data.title', 'Bài tập user A');

    // User B gets 404 when trying to view User A's session
    $this->actingAs($userB)
        ->getJson("/api/v1/presentation/sessions/{$session->id}")
        ->assertNotFound();
});

it('streams audio only to the session owner', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $audioContent = 'fake-audio-bytes';
    $path = 'presentations/audio/test.webm';
    Storage::disk('local')->put($path, $audioContent);

    $session = PresentationSession::create([
        'user_id' => $userA->id,
        'status' => 'completed',
        'audio_path' => $path,
    ]);

    // User A can stream audio
    $this->actingAs($userA)
        ->get("/api/v1/presentation/sessions/{$session->id}/audio")
        ->assertOk();

    // User B cannot stream User A's audio
    $this->actingAs($userB)
        ->get("/api/v1/presentation/sessions/{$session->id}/audio")
        ->assertNotFound();
});
