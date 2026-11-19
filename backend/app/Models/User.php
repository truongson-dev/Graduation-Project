<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Ai\Concerns\HasConversations;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'google_id', 'avatar_url', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements HasMedia, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasConversations, HasFactory, HasRoles, InteractsWithMedia, Notifiable;

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
            'status' => 'string',
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

    /**
     * Get the user's community profile.
     *
     * @return HasOne<CommunityProfile, $this>
     */
    public function communityProfile(): HasOne
    {
        return $this->hasOne(CommunityProfile::class);
    }

    /**
     * Get the community posts created by the user.
     *
     * @return HasMany<CommunityPost, $this>
     */
    public function communityPosts(): HasMany
    {
        return $this->hasMany(CommunityPost::class);
    }

    /**
     * Get the gamification profile for the user.
     *
     * @return HasOne<UserGamification, $this>
     */
    public function gamification(): HasOne
    {
        return $this->hasOne(UserGamification::class);
    }

    /**
     * Get the lesson progress records for the user.
     *
     * @return HasMany<UserLessonProgress, $this>
     */
    public function lessonProgress(): HasMany
    {
        return $this->hasMany(UserLessonProgress::class);
    }

    /**
     * Get the daily streak history for the user.
     *
     * @return HasMany<UserDailyStreak, $this>
     */
    public function dailyStreaks(): HasMany
    {
        return $this->hasMany(UserDailyStreak::class);
    }

    /**
     * Get the users that this user follows.
     *
     * @return BelongsToMany<User, $this>
     */
    public function following(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'community_follows', 'follower_id', 'following_id');
    }

    /**
     * Get the users that follow this user.
     *
     * @return BelongsToMany<User, $this>
     */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'community_follows', 'following_id', 'follower_id');
    }

    /**
     * Register media collections for the user.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    }

    /**
     * Register media conversions for the user.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 150, 150)
            ->nonQueued();
    }

    /**
     * Get the user's avatar URL from media library, falling back to avatar_url column.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->hasMedia('avatar')) {
            return $this->getFirstMediaUrl('avatar');
        }

        return $this->attributes['avatar_url'] ?? null;
    }
}
