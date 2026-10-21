<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;

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
        ->assertJsonStructure(['data' => ['user', 'token', 'token_type']])
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

it('throttles repeated login attempts', function () {
    User::factory()->create(['email' => 'a@example.com']);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'a@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'a@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();

    expect($response->headers->get('Retry-After'))->not->toBeNull();
});
