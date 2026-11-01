<?php

use App\Ai\Agents\AnswerGrader;
use App\Ai\Agents\SoftSkillCoach;
use App\Auth\AuthTokenService;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Models\Conversation;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

beforeEach(function () {
    config([
        'ai.providers.gemini.key' => 'test-key',
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect' => 'http://localhost/api/v1/auth/social/google/callback',
    ]);
    Gate::define('viewApiDocs', fn () => true);
});

it('benchmarks response times of all api endpoints', function () {
    $results = [];

    $benchmark = function (string $name, string $method, string $uri, Closure $runner) use (&$results) {
        Cache::flush();

        // Warmup run
        $runner();

        $durations = [];
        $status = 0;

        for ($i = 0; $i < 5; $i++) {
            Cache::flush();
            $start = microtime(true);
            $res = $runner();
            $duration = (microtime(true) - $start) * 1000;
            $durations[] = $duration;
            $status = $res->getStatusCode();
        }

        $min = min($durations);
        $max = max($durations);
        $avg = array_sum($durations) / count($durations);

        $results[] = [
            'name' => $name,
            'method' => $method,
            'uri' => $uri,
            'status' => $status,
            'min_ms' => round($min, 2),
            'avg_ms' => round($avg, 2),
            'max_ms' => round($max, 2),
        ];
    };

    // 1. Health check
    $benchmark('System Health', 'GET', '/api/health', function () {
        return $this->getJson('/api/health');
    });

    // 2. Auth: Register
    $regCounter = 0;
    $benchmark('Auth: Register', 'POST', '/api/v1/auth/register', function () use (&$regCounter) {
        $regCounter++;

        return $this->postJson('/api/v1/auth/register', [
            'name' => "User {$regCounter}",
            'email' => "user{$regCounter}_".Str::random(5).'@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'device_name' => 'benchmark-device',
        ]);
    });

    // 3. Auth: Login
    $loginUser = User::factory()->create([
        'email' => 'login_bench@example.com',
        'password' => 'Password123!',
    ]);
    $benchmark('Auth: Login', 'POST', '/api/v1/auth/login', function () use ($loginUser) {
        return $this->postJson('/api/v1/auth/login', [
            'email' => $loginUser->email,
            'password' => 'Password123!',
            'device_name' => 'benchmark-device',
        ]);
    });

    // 4. Auth: Me Profile
    $meUser = User::factory()->create();
    $token = $meUser->createToken('test')->plainTextToken;
    $benchmark('Auth: Me Profile', 'GET', '/api/v1/auth/me', function () use ($token) {
        return $this->withToken($token)->getJson('/api/v1/auth/me');
    });

    // 5. Auth: Token Refresh
    $tokens = app(AuthTokenService::class);
    $benchmark('Auth: Token Refresh', 'POST', '/api/v1/auth/refresh', function () use ($tokens, $meUser) {
        $pair = $tokens->issue($meUser, 'device');

        return $this->postJson('/api/v1/auth/refresh', [
            'refresh_token' => $pair['refresh_token'],
        ]);
    });

    // 6. Auth: Forgot Password
    $forgotUser = User::factory()->create(['email' => 'forgot_bench@example.com']);
    $benchmark('Auth: Forgot Password', 'POST', '/api/v1/auth/forgot-password', function () use ($forgotUser) {
        return $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $forgotUser->email,
        ]);
    });

    // 7. Auth: Reset Password
    $benchmark('Auth: Reset Password', 'POST', '/api/v1/auth/reset-password', function () {
        $user = User::factory()->create(['password' => 'OldPass123!']);
        $token = Password::broker()->createToken($user);

        return $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ]);
    });

    // 8. Auth: Send Email Verification
    $unverifiedUser = User::factory()->unverified()->create();
    $benchmark('Auth: Resend Email Verification', 'POST', '/api/v1/auth/email/verification-notification', function () use ($unverifiedUser) {
        return $this->actingAs($unverifiedUser)
            ->postJson('/api/v1/auth/email/verification-notification');
    });

    // 9. Auth: Verify Email Link
    $benchmark('Auth: Verify Email Link', 'GET', '/api/v1/auth/email/verify/{id}/{hash}', function () {
        $u = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $u->getKey(),
                'hash' => sha1($u->getEmailForVerification()),
            ]
        );

        return $this->getJson($url);
    });

    // 10. Auth: Google Social Redirect
    $benchmark('Auth: Social Google Redirect', 'GET', '/api/v1/auth/social/google/redirect', function () {
        Socialite::fake('google');

        return $this->getJson('/api/v1/auth/social/google/redirect');
    });

    // 11. Auth: Google Social Callback
    $benchmark('Auth: Social Google Callback', 'GET', '/api/v1/auth/social/google/callback', function () {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'g-'.Str::random(8),
            'name' => 'Benchmark User',
            'email' => Str::random(8).'@gmail.com',
            'avatar' => 'https://example.com/avatar.png',
            'email_verified' => true,
        ]));
        $stateRes = $this->getJson('/api/v1/auth/social/google/redirect?device_name=bench');
        $state = $stateRes->json('data.state');

        return $this->getJson('/api/v1/auth/social/google/callback?code=mock_code&state='.$state);
    });

    // 12. Auth: Social Exchange Code
    $benchmark('Auth: Social Exchange Code', 'POST', '/api/v1/auth/social/exchange', function () use ($meUser) {
        $code = Str::random(40);
        Cache::put('auth:oauth:exchange:'.hash('sha256', $code), $meUser->getKey(), now()->addMinutes(2));

        return $this->postJson('/api/v1/auth/social/exchange', ['code' => $code]);
    });

    // 13. Auth: Logout
    $benchmark('Auth: Logout', 'POST', '/api/v1/auth/logout', function () use ($meUser) {
        $t = $meUser->createToken('logout-token')->plainTextToken;

        return $this->withToken($t)->postJson('/api/v1/auth/logout');
    });

    // 14. AI: Chat Stream
    SoftSkillCoach::fake(['Phản hồi huấn luyện viên kiểm thử hiệu năng.']);
    $benchmark('AI: Chat Stream (SSE)', 'POST', '/api/v1/ai/chat', function () use ($meUser) {
        return $this->actingAs($meUser)->post(
            '/api/v1/ai/chat',
            ['message' => 'Làm thế nào để cải thiện kỹ năng lắng nghe?'],
            ['Accept' => 'text/event-stream']
        );
    });

    // 15. AI: Grade Answer / Feedback
    AnswerGrader::fake([[
        'score' => 90,
        'summary' => 'Câu trả lời rất tốt và rõ ràng.',
        'strengths' => ['Lập luận chặt chẽ.'],
        'improvements' => ['Nên thêm ví dụ.'],
    ]]);
    $benchmark('AI: Feedback Grader', 'POST', '/api/v1/ai/feedback', function () use ($meUser) {
        return $this->actingAs($meUser)->postJson('/api/v1/ai/feedback', [
            'skill' => 'Giao tiếp',
            'question' => 'Cách xử lý khi xung đột quan điểm?',
            'answer' => 'Lắng nghe chủ động và tìm điểm chung.',
        ]);
    });

    // 16. AI: List Conversations
    $store = app(ConversationStore::class);
    $store->storeConversation(Conversation::participantType($meUser), Conversation::participantKey($meUser), 'Cuộc trò chuyện 1');
    $store->storeConversation(Conversation::participantType($meUser), Conversation::participantKey($meUser), 'Cuộc trò chuyện 2');
    $benchmark('AI: List Conversations', 'GET', '/api/v1/ai/conversations', function () use ($meUser) {
        return $this->actingAs($meUser)->getJson('/api/v1/ai/conversations');
    });

    // 17. AI: Conversation Messages
    $convId = $store->storeConversation(Conversation::participantType($meUser), Conversation::participantKey($meUser), 'Cuộc trò chuyện tin nhắn');
    $benchmark('AI: Conversation Messages', 'GET', '/api/v1/ai/conversations/{id}/messages', function () use ($meUser, $convId) {
        return $this->actingAs($meUser)->getJson("/api/v1/ai/conversations/{$convId}/messages");
    });

    // 18. Docs: UI
    $benchmark('Docs: OpenAPI UI', 'GET', '/docs/api', function () {
        return $this->get('/docs/api');
    });

    // 19. Docs: JSON spec
    $benchmark('Docs: OpenAPI JSON', 'GET', '/docs/api.json', function () {
        return $this->get('/docs/api.json');
    });

    // Output formatted JSON results to STDERR
    fwrite(STDERR, "\nBENCHMARK_START\n".json_encode($results, JSON_PRETTY_PRINT)."\nBENCHMARK_END\n");

    expect(count($results))->toBe(19);
});
