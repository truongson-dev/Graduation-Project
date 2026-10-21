<?php

use App\Models\User;

it('returns the authenticated user to a token client', function () {
    $user = User::factory()->create(['name' => 'Nguyen Van A']);
    $token = $user->createToken('pixel-8')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.name', 'Nguyen Van A')
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.roles', []);
});

it('returns the authenticated user to a spa session', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);
});

it('rejects unauthenticated requests', function () {
    $this->getJson('/api/v1/auth/me')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Unauthenticated.');
});
