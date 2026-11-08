<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'google_id', 'avatar_url'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasConversations, HasFactory, HasRoles, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Assign the configured default role to a self-registered account.
     */
    public function assignDefaultRole(): void
    {
        $role = config('auth.default_role');

        if (is_string($role) && $role !== '') {
            $this->assignRole(Role::findOrCreate($role, 'web'));
        }
    }

    /**
     * Send the e-mail verification notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    /**
     * Send the password reset notification.
     */
    public function sendPasswordResetNotification(mixed $token): void
    {
        $this->notify(new ResetPasswordNotification((string) $token));
    }

    /**
     * Get the refresh tokens issued to this user.
     *
     * @return HasMany<AuthRefreshToken, $this>
     */
    public function refreshTokens(): HasMany
    {
        return $this->hasMany(AuthRefreshToken::class);
    }

    /**
     * Get the presentation sessions for the user.
     *
     * @return HasMany<PresentationSession, $this>
     */
    public function presentationSessions(): HasMany
    {
        return $this->hasMany(PresentationSession::class);
    }
}
