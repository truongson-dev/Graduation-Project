<?php

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

it('verifies the email address from a signed link', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1($user->email),
    ]);

    $this->getJson($url)
        ->assertOk()
        ->assertJsonPath('message', 'Email đã được xác minh.');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('redirects a browser to the frontend after verification', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1($user->email),
    ]);

    $this->get($url)
        ->assertRedirect(config('app.frontend_url').'/login?verified=1');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('rejects a tampered verification link', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1($user->email),
    ]);

    $this->getJson($url.'&extra=1')->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects an expired verification link', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
        'id' => $user->id,
        'hash' => sha1($user->email),
    ]);

    $this->getJson($url)->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects a link whose hash does not match the current email', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1('other@example.com'),
    ]);

    $this->getJson($url)->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('resends the verification email to an unverified user', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();
    $token = $user->createToken('pixel-8')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertStatus(202)
        ->assertJsonPath('message', 'Đã gửi lại liên kết xác minh email.');

    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

it('does not resend the verification email to a verified user', function () {
    Notification::fake();

    $user = User::factory()->create();
    $token = $user->createToken('pixel-8')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'Email đã được xác minh.');

    Notification::assertNothingSent();
});

it('requires authentication to resend the verification email', function () {
    $this->postJson('/api/v1/auth/email/verification-notification')
        ->assertUnauthorized();
});
