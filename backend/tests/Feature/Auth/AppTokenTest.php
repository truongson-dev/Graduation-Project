<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Socialite\Socialite;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect' => 'http://localhost/api/v1/auth/social/google/callback',
    ]);
});

it('completes the full mobile token lifecycle: register, call me, refresh, call me again, logout', function () {
    // 1. Register with device_name
    $registerRes = $this->postJson('/api/v1/auth/register', [
        'name' => 'Mobile User',
        'email' => 'mobile.user@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'device_name' => 'pixel-8',
    ])->assertCreated();

    $registerRes->assertJsonStructure([
        'data' => [
            'user' => ['id', 'name', 'email', 'roles'],
            'token',
            'refresh_token',
            'token_type',
            'expires_in',
        ],
    ]);

    $accessToken = $registerRes->json('data.token');
    $refreshToken = $registerRes->json('data.refresh_token');

    expect($accessToken)->toContain('|ssk_');
    expect($registerRes->json('data.token_type'))->toBe('Bearer');
    expect($registerRes->json('data.expires_in'))->toBe(900);
    expect($refreshToken)->toBeString()->toHaveLength(80);

    // 2. Call /me with the access token
    $meRes = $this->withToken($accessToken)
        ->getJson('/api/v1/auth/me')
        ->assertOk();

    expect($meRes->json('data.email'))->toBe('mobile.user@example.com');

    // 3. Refresh the token
    $refreshRes = $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $refreshToken,
    ])->assertOk();

    $refreshRes->assertJsonStructure([
        'data' => [
            'token',
            'refresh_token',
            'token_type',
            'expires_in',
        ],
    ]);

    $newAccessToken = $refreshRes->json('data.token');
    $newRefreshToken = $refreshRes->json('data.refresh_token');

    expect($newAccessToken)->toContain('|ssk_')->not->toBe($accessToken);
    expect($newRefreshToken)->toHaveLength(80)->not->toBe($refreshToken);

    // Old access token MUST be rejected
    $this->app['auth']->forgetGuards();
    $this->withToken($accessToken)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();

    // New access token MUST work
    $this->app['auth']->forgetGuards();
    $this->withToken($newAccessToken)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'mobile.user@example.com');

    // 4. Logout using new access token
    $this->withToken($newAccessToken)
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    // Both new access token and new refresh token MUST now be dead
    $this->app['auth']->forgetGuards();
    $this->withToken($newAccessToken)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();

    $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $newRefreshToken,
    ])->assertUnauthorized();
});

it('issues tokens via login with device_name and supports multiple refreshes', function () {
    $user = User::factory()->create([
        'email' => 'login.app@example.com',
        'password' => 'Password123!',
    ]);

    $loginRes = $this->postJson('/api/v1/auth/login', [
        'email' => 'login.app@example.com',
        'password' => 'Password123!',
        'device_name' => 'iphone-15',
    ])->assertOk();

    $loginRes->assertJsonStructure([
        'data' => ['user', 'token', 'refresh_token', 'token_type', 'expires_in'],
    ]);

    $token1 = $loginRes->json('data.token');
    $refresh1 = $loginRes->json('data.refresh_token');

    // First rotation
    $rot1 = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh1])->assertOk();
    $token2 = $rot1->json('data.token');
    $refresh2 = $rot1->json('data.refresh_token');

    // Second rotation
    $rot2 = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh2])->assertOk();
    $token3 = $rot2->json('data.token');
    $refresh3 = $rot2->json('data.refresh_token');

    expect($token3)->not->toBe($token2)->not->toBe($token1);
    expect($refresh3)->not->toBe($refresh2)->not->toBe($refresh1);

    // Token 3 works
    $this->app['auth']->forgetGuards();
    $this->withToken($token3)->getJson('/api/v1/auth/me')->assertOk();
});

it('rejects expired Sanctum access tokens on protected routes', function () {
    $user = User::factory()->create();
    $loginRes = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'pixel-8',
    ])->assertOk();

    $token = $loginRes->json('data.token');

    // Fast-forward or artificially expire the access token in database
    $personalToken = PersonalAccessToken::findToken($token);
    expect($personalToken)->not->toBeNull();
    $personalToken->forceFill(['created_at' => now()->subMinutes(20), 'expires_at' => now()->subMinutes(5)])->save();

    $this->app['auth']->forgetGuards();
    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

it('rejects refresh when token is missing, invalid or malformed', function () {
    // Missing
    $this->postJson('/api/v1/auth/refresh', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['refresh_token']);

    // Too short (< 40 chars)
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => 'short'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['refresh_token']);

    // Non-existent 80-char string
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => str_repeat('a', 80)])
        ->assertUnauthorized();
});

it('protects email verification resend with sanctum bearer token', function () {
    $user = User::factory()->unverified()->create();
    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'test-device',
    ])->assertOk();

    $token = $login->json('data.token');

    $this->withToken($token)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertAccepted();
});

it('revokes entire token family when a rotated refresh token is reused', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'pixel-8',
    ])->assertOk();

    $refresh1 = $login->json('data.refresh_token');

    // First rotation succeeds
    $rot = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh1])->assertOk();
    $token2 = $rot->json('data.token');
    $refresh2 = $rot->json('data.refresh_token');

    // Attacker tries to reuse refresh1
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh1])
        ->assertUnauthorized();

    // Now refresh2 and token2 MUST also be revoked due to family compromise detection
    $this->app['auth']->forgetGuards();
    $this->withToken($token2)->getJson('/api/v1/auth/me')->assertUnauthorized();

    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh2])
        ->assertUnauthorized();
});

it('allows logout with refresh_token when access token has already expired', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'pixel-8',
    ])->assertOk();

    $accessToken = $login->json('data.token');
    $refreshToken = $login->json('data.refresh_token');

    // Expire the access token in DB
    $personalToken = PersonalAccessToken::findToken($accessToken);
    $personalToken->forceFill(['expires_at' => now()->subMinutes(10)])->save();

    // Mobile client logs out by providing refresh_token even though access token is expired
    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/logout', [
        'refresh_token' => $refreshToken,
    ])->assertNoContent();

    // Refresh token must now be revoked
    $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $refreshToken,
    ])->assertUnauthorized();
});

it('rejects logout with 401 when neither valid token nor refresh_token is provided', function () {
    $this->app['auth']->forgetGuards();
    $this->postJson('/api/v1/auth/logout', [])
        ->assertUnauthorized();
});

it('keeps sessions isolated across multiple devices for the same user', function () {
    $user = User::factory()->create();

    // Phone login
    $phoneLogin = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'phone',
    ])->assertOk();
    $phoneToken = $phoneLogin->json('data.token');
    $phoneRefresh = $phoneLogin->json('data.refresh_token');

    // Tablet login
    $tabletLogin = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'tablet',
    ])->assertOk();
    $tabletToken = $tabletLogin->json('data.token');
    $tabletRefresh = $tabletLogin->json('data.refresh_token');

    // Refresh phone token
    $phoneRot = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $phoneRefresh])->assertOk();
    $phoneNewToken = $phoneRot->json('data.token');

    // Tablet token must STILL be fully valid and working
    $this->app['auth']->forgetGuards();
    $this->withToken($tabletToken)->getJson('/api/v1/auth/me')->assertOk();

    // Logout on phone
    $this->app['auth']->forgetGuards();
    $this->withToken($phoneNewToken)->postJson('/api/v1/auth/logout')->assertNoContent();
    expect(PersonalAccessToken::findToken($tabletToken))->not->toBeNull();

    // Tablet token must STILL work even after phone logged out
    $this->app['auth']->forgetGuards();
    $this->withToken($tabletToken)->getJson('/api/v1/auth/me')->assertOk();

    // Tablet refresh must STILL work
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $tabletRefresh])->assertOk();
});

it('returns token payload for mobile clients in google oauth callback', function () {
    Socialite::fake('google', Laravel\Socialite\Two\User::fake([
        'id' => 'google-mobile-id',
        'name' => 'Mobile Google User',
        'email' => 'mobile.google@example.com',
        'email_verified' => true,
    ]));

    $redirectRes = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8')
        ->assertOk();

    $state = $redirectRes->json('data.state');
    expect($state)->toBeString()->toHaveLength(40);

    // Callback with state
    $callbackRes = $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state)
        ->assertOk();

    $callbackRes->assertJsonStructure([
        'data' => [
            'user' => ['id', 'name', 'email', 'roles'],
            'token',
            'refresh_token',
            'token_type',
            'expires_in',
        ],
    ]);

    $token = $callbackRes->json('data.token');
    expect($token)->toContain('|ssk_');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'mobile.google@example.com');
});
