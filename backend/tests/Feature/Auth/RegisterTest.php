<?php

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

it('registers a user through the spa and starts a session', function () {
    Notification::fake();

    $response = $this->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/register', [
            'name' => 'Nguyen Van A',
            'email' => 'A@Example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.user.email', 'a@example.com')
        ->assertJsonPath('data.user.roles', ['student'])
        ->assertJsonMissingPath('data.token');

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'a@example.com']);

    Notification::assertSentTo(
        User::query()->where('email', 'a@example.com')->firstOrFail(),
        VerifyEmailNotification::class,
    );
});

it('registers a mobile device and returns a bearer token', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van B',
        'email' => 'b@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'device_name' => 'pixel-8',
    ]);

    $response->assertCreated()
        ->assertJsonStructure(['data' => ['user', 'token', 'token_type']])
        ->assertJsonPath('data.token_type', 'Bearer');

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();

    $this->assertGuest();
    expect(User::query()->firstOrFail()->tokens()->count())->toBe(1);
});

it('rejects a duplicate email regardless of letter case', function () {
    User::factory()->create(['email' => 'a@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van C',
        'email' => 'A@Example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    $this->assertDatabaseCount('users', 1);
});

it('rejects a password confirmation that does not match', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van D',
        'email' => 'd@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password1234!',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('requires a special character in a new password', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van F',
        'email' => 'f@example.com',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->assertDatabaseCount('users', 0);
});

it('rejects a password longer than the bcrypt limit', function () {
    $password = str_repeat('a', 73);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van E',
        'email' => 'e@example.com',
        'password' => $password,
        'password_confirmation' => $password,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->assertDatabaseCount('users', 0);
});
