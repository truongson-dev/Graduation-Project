<?php

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

it('sends a reset link that points to the frontend', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'front@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'Front@Example.com'])
        ->assertStatus(202)
        ->assertJsonPath('message', 'Nếu email này tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.');

    Notification::assertSentTo(
        $user,
        ResetPasswordNotification::class,
        function (ResetPasswordNotification $notification, array $channels, User $notifiable): bool {
            $mail = $notification->toMail($notifiable);

            expect($mail->actionUrl)
                ->toStartWith(config('auth.reset_url'))
                ->toContain('token=')
                ->toContain('email='.urlencode($notifiable->email));

            return true;
        },
    );
});

it('does not reveal whether an email address exists', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.com'])
        ->assertStatus(202)
        ->assertJsonPath('message', 'Nếu email này tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.');

    Notification::assertNothingSent();
});

it('throttles repeated reset link requests', function () {
    Notification::fake();

    User::factory()->create(['email' => 'throttle@example.com']);

    foreach (range(1, 3) as $attempt) {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'throttle@example.com'])
            ->assertStatus(202);
    }

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'throttle@example.com'])
        ->assertTooManyRequests();
});

it('resets the password and revokes existing access tokens', function () {
    $user = User::factory()->create([
        'email' => 'reset@example.com',
        'password' => 'OldPassword1',
    ]);
    $user->createToken('pixel-8');
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'Reset@Example.com',
        'password' => 'NewPassword1',
        'password_confirmation' => 'NewPassword1',
    ])->assertOk()
        ->assertJsonPath('message', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.');

    expect(Hash::check('NewPassword1', $user->fresh()->password))->toBeTrue()
        ->and($user->tokens()->count())->toBe(0)
        ->and(Password::broker()->tokenExists($user, $token))->toBeFalse();
});

it('rejects an invalid reset token with a neutral message', function () {
    User::factory()->create(['email' => 'reset@example.com']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'invalid-token',
        'email' => 'reset@example.com',
        'password' => 'NewPassword1',
        'password_confirmation' => 'NewPassword1',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('validates the new password confirmation', function () {
    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'irrelevant',
        'email' => 'reset@example.com',
        'password' => 'NewPassword1',
        'password_confirmation' => 'NewPassword2',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});
