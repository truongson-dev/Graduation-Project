<?php

use App\Models\User;

it('revokes the current access token on logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('pixel-8');
    $plainTextToken = $token->plainTextToken;

    $this->withToken($plainTextToken)
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    expect($user->tokens()->count())->toBe(0);
    expect($user->tokens()->pluck('id')->all())->not->toContain($token->accessToken->id);

    // A fresh request cycle resolves the guard again, like a real HTTP request.
    $this->app['auth']->forgetGuards();

    $this->withToken($plainTextToken)
        ->getJson('/api/v1/auth/me')
        ->assertUnauthorized();
});

it('invalidates the spa session on logout', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $this->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    expect(session()->all())->not->toHaveKey('login_web_'.sha1(config('auth.guards.web.provider')));
    expect(Auth::guard('web')->id())->toBeNull();

    $this->app['auth']->forgetGuards();

    $this->assertGuest();
});
