<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

it('logs a spa user in through the session cookie', function () {
    $user = User::factory()->create(['email' => 'student@example.com']);
    $user->assignRole('student');

    $response = $this->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'email' => 'Student@Example.com',
            'password' => 'password',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.user.email', 'student@example.com')
        ->assertJsonPath('data.user.roles', ['student'])
        ->assertJsonMissingPath('data.token');

    $this->assertAuthenticatedAs($user);
});

it('returns a bearer token to a mobile device', function () {
    $user = User::factory()->create(['email' => 'mobile@example.com']);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'mobile@example.com',
        'password' => 'password',
        'device_name' => 'pixel-8',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['data' => ['user', 'token', 'refresh_token', 'token_type', 'expires_in']])
        ->assertJsonPath('data.token_type', 'Bearer');

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
    expect($user->tokens()->count())->toBe(1);

    $this->assertGuest();
});

it('rejects invalid credentials without revealing which field is wrong', function () {
    User::factory()->create(['email' => 'a@example.com']);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'a@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    expect($response->json('errors.email.0'))->toBe('Thông tin đăng nhập không chính xác.');

    $this->assertGuest();
});

it('locks the account for fifteen minutes after five consecutive failures', function () {
    User::factory()->create(['email' => 'a@example.com']);

    foreach (range(1, 4) as $attempt) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'a@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'a@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(423)
        ->assertJsonPath('message', 'Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau 15 phút.')
        ->assertJsonPath('retry_after_seconds', 900);

    expect($response->headers->get('Retry-After'))->toBe('900');

    $this->postJson('/api/v1/auth/login', [
        'email' => 'a@example.com',
        'password' => 'password',
    ])->assertStatus(423);

    Cache::forget('auth:login:locked:'.hash('sha256', 'a@example.com'));

    $this->postJson('/api/v1/auth/login', [
        'email' => 'a@example.com',
        'password' => 'password',
        'device_name' => 'test-device',
    ])->assertOk();
});
