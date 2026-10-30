<?php

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

it('rotates the refresh token and revokes its previous access token', function () {
    $user = User::factory()->create();

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'test-device',
    ])->assertOk();

    $oldAccessToken = $login->json('data.token');
    $oldRefreshToken = $login->json('data.refresh_token');

    $rotated = $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $oldRefreshToken,
    ])->assertOk()
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonPath('data.expires_in', 900);

    expect($rotated->json('data.token'))->not->toBe($oldAccessToken)
        ->and($rotated->json('data.refresh_token'))->not->toBe($oldRefreshToken);

    $this->withToken($oldAccessToken)->getJson('/api/v1/auth/me')->assertUnauthorized();

    $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $oldRefreshToken,
    ])->assertUnauthorized();

    $newAccessToken = $rotated->json('data.token');
    expect(PersonalAccessToken::findToken($newAccessToken))->toBeNull();
});

it('rejects an expired refresh token', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'test-device',
    ])->assertOk();

    $plainRefreshToken = $login->json('data.refresh_token');
    $user->refreshTokens()->firstOrFail()->forceFill(['expires_at' => now()->subSecond()])->save();

    $this->postJson('/api/v1/auth/refresh', [
        'refresh_token' => $plainRefreshToken,
    ])->assertUnauthorized();
});
