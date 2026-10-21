<?php

use App\Models\User;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect' => 'http://localhost/api/v1/auth/social/google/callback',
    ]);
});

it('returns the Google authorization url with a one time state', function () {
    Socialite::fake('google');

    $response = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8');

    $response->assertOk()
        ->assertJsonStructure(['data' => ['url', 'state', 'expires_in']])
        ->assertJsonPath('data.expires_in', 600);

    expect($response->json('data.url'))->toContain('socialite.fake');
    expect($response->json('data.state'))->toBeString()->not->toBeEmpty();
});

it('requires Google credentials to be configured', function () {
    config(['services.google.client_id' => null]);

    $this->getJson('/api/v1/auth/social/google/redirect')->assertStatus(503);
});

it('creates an account from the Google callback for a mobile client', function () {
    Socialite::fake('google', SocialiteUser::fake([
        'id' => 'google-123',
        'name' => 'Nguyen Van G',
        'email' => 'G@Example.com',
        'avatar' => 'https://example.com/g.png',
        'email_verified' => true,
    ]));

    $state = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8')
        ->json('data.state');

    $response = $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state);

    $response->assertOk()
        ->assertJsonStructure(['data' => ['user', 'token', 'token_type']])
        ->assertJsonPath('data.user.email', 'g@example.com')
        ->assertJsonPath('data.user.roles', ['student'])
        ->assertJsonPath('data.token_type', 'Bearer');

    $user = User::query()->firstOrFail();

    expect($user->google_id)->toBe('google-123')
        ->and($user->avatar_url)->toBe('https://example.com/g.png')
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and($user->tokens()->count())->toBe(1);
});

it('links an existing account by email', function () {
    $user = User::factory()->unverified()->create(['email' => 'link@example.com']);

    Socialite::fake('google', SocialiteUser::fake([
        'id' => 'google-999',
        'name' => 'Link User',
        'email' => 'Link@Example.com',
        'email_verified' => true,
    ]));

    $state = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8')
        ->json('data.state');

    $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state)
        ->assertOk();

    expect($user->fresh()->google_id)->toBe('google-999')
        ->and($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and(User::query()->count())->toBe(1);
});

it('rejects linking a second Google account to the same email', function () {
    User::factory()->create([
        'email' => 'conflict@example.com',
        'google_id' => 'google-first',
    ]);

    Socialite::fake('google', SocialiteUser::fake([
        'id' => 'google-second',
        'email' => 'conflict@example.com',
        'name' => 'Conflict',
    ]));

    $state = $this->getJson('/api/v1/auth/social/google/redirect')->json('data.state');

    $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('redirects the browser to the frontend with a token fragment', function () {
    Socialite::fake('google', SocialiteUser::fake([
        'id' => 'google-browser',
        'name' => 'Browser User',
        'email' => 'browser@example.com',
        'email_verified' => true,
    ]));

    $state = $this->getJson('/api/v1/auth/social/google/redirect')->json('data.state');

    $response = $this->get('/api/v1/auth/social/google/callback?code=fake-code&state='.$state);

    $response->assertRedirect();

    expect($response->headers->get('Location'))
        ->toStartWith(config('app.frontend_url').'/auth/callback#')
        ->toContain('token=')
        ->toContain('token_type=Bearer');
});

it('rejects an unknown or expired state', function () {
    Socialite::fake('google');

    $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state=unknown')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('state');
});

it('handles a denied Google consent', function () {
    Socialite::fake('google');

    $state = $this->getJson('/api/v1/auth/social/google/redirect')->json('data.state');

    $this->getJson('/api/v1/auth/social/google/callback?error=access_denied&state='.$state)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('state');
});

it('refuses to link an account when Google did not verify the email', function () {
    $user = User::factory()->unverified()->create(['email' => 'squatted@example.com']);

    Socialite::fake('google', SocialiteUser::fake([
        'id' => 'google-unverified',
        'email' => 'squatted@example.com',
        'email_verified' => false,
    ]));

    $state = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8')
        ->json('data.state');

    $this->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    expect($user->fresh()->google_id)->toBeNull();
});

it('rejects a callback coming from another client', function () {
    Socialite::fake('google');

    $state = $this->getJson('/api/v1/auth/social/google/redirect?device_name=pixel-8')
        ->json('data.state');

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])
        ->getJson('/api/v1/auth/social/google/callback?code=fake-code&state='.$state)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('state');
});
