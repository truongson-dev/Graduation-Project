<?php

namespace App\Auth;

use App\Models\AuthRefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthTokenService
{
    private const ACCESS_TOKEN_MINUTES = 15;

    private const REFRESH_TOKEN_DAYS = 30;

    /**
     * Issue an access and refresh token pair for a new sign-in session.
     *
     * @return array{token: string, refresh_token: string, token_type: string, expires_in: int}
     */
    public function issue(User $user, string $deviceName): array
    {
        return DB::transaction(function () use ($user, $deviceName): array {
            return $this->issuePair($user, $deviceName, (string) Str::uuid());
        });
    }

    /**
     * Rotate a refresh token and revoke the previous access token in its family.
     *
     * @return array{token: string, refresh_token: string, token_type: string, expires_in: int}|null
     */
    public function rotate(string $plainTextToken): ?array
    {
        return DB::transaction(function () use ($plainTextToken): ?array {
            $refreshToken = AuthRefreshToken::query()
                ->where('token_hash', hash('sha256', $plainTextToken))
                ->lockForUpdate()
                ->first();

            if (! $refreshToken instanceof AuthRefreshToken) {
                return null;
            }

            $user = $refreshToken->user;

            if (! $user instanceof User) {
                return null;
            }

            if ($refreshToken->revoked_at !== null) {
                $this->revokeFamily($user, $refreshToken->family_id);

                return null;
            }

            if ($refreshToken->expires_at->isPast()) {
                $refreshToken->forceFill(['revoked_at' => now()])->save();

                return null;
            }

            $refreshToken->forceFill(['revoked_at' => now()])->save();
            $this->revokeFamilyAccessTokens($user, $refreshToken->family_id);

            return $this->issuePair($user, $refreshToken->device_name, $refreshToken->family_id);
        });
    }

    /**
     * Revoke the refresh token family associated with a Sanctum access token.
     */
    public function revokeForAccessToken(User $user, ?PersonalAccessToken $accessToken): void
    {
        if (! $accessToken instanceof PersonalAccessToken || ! preg_match('/\|([0-9a-f-]{36})$/i', $accessToken->name, $matches)) {
            return;
        }

        $this->revokeFamily($user, $matches[1]);
    }

    /**
     * Revoke every refresh token and access token belonging to a user.
     */
    public function revokeAllForUser(User $user): void
    {
        AuthRefreshToken::query()
            ->where('user_id', $user->getKey())
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $user->tokens()->delete();
    }

    /**
     * Create a fresh pair of opaque credentials for an existing token family.
     *
     * @return array{token: string, refresh_token: string, token_type: string, expires_in: int}
     */
    private function issuePair(User $user, string $deviceName, string $familyId): array
    {
        $plainTextRefreshToken = Str::random(80);

        AuthRefreshToken::query()->create([
            'user_id' => $user->getKey(),
            'family_id' => $familyId,
            'device_name' => $deviceName,
            'token_hash' => hash('sha256', $plainTextRefreshToken),
            'expires_at' => now()->addDays(self::REFRESH_TOKEN_DAYS),
        ]);

        $accessToken = $user->createToken(
            $deviceName.'|'.$familyId,
            ['*'],
            now()->addMinutes(self::ACCESS_TOKEN_MINUTES),
        );

        return [
            'token' => $accessToken->plainTextToken,
            'refresh_token' => $plainTextRefreshToken,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_MINUTES * 60,
        ];
    }

    /**
     * Revoke a complete sign-in session and all of its refresh tokens.
     */
    private function revokeFamily(User $user, string $familyId): void
    {
        AuthRefreshToken::query()
            ->where('user_id', $user->getKey())
            ->where('family_id', $familyId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $this->revokeFamilyAccessTokens($user, $familyId);
    }

    /**
     * Revoke all access tokens belonging to a sign-in session.
     */
    private function revokeFamilyAccessTokens(User $user, string $familyId): void
    {
        $user->tokens()
            ->where('name', 'like', '%|'.$familyId)
            ->delete();
    }
}
