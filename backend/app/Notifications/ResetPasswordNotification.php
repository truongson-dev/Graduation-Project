<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public readonly string $token) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  User  $notifiable
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Đặt lại mật khẩu')
            ->greeting('Xin chào '.$notifiable->name.',')
            ->line('Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.')
            ->action('Đặt lại mật khẩu', $this->resetUrl($notifiable->getEmailForPasswordReset()))
            ->line('Liên kết này sẽ hết hạn sau 60 phút.')
            ->line('Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.');
    }

    /**
     * Build the frontend URL that receives the reset token.
     */
    private function resetUrl(string $email): string
    {
        $base = config('auth.reset_url');
        $base = is_string($base) && $base !== '' ? $base : url('/reset-password');

        return $base.(str_contains($base, '?') ? '&' : '?').http_build_query([
            'token' => $this->token,
            'email' => $email,
        ]);
    }
}
