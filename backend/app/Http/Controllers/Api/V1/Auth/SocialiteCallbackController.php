<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Auth\AuthTokenService;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as SocialiteUser;

class SocialiteCallbackController extends Controller
{
    /**
     * Authenticate the user returned by the Google callback.
     */
    public function __invoke(Request $request): JsonResponse|RedirectResponse
    {
        $intent = OAuthState::pull($request->query('state'), $request);

        if ($intent === null) {
            return $this->failedAuth(
                $request,
                'invalid_state',
                'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
            );
        }

        if ($request->query('error') !== null) {
            return $this->failedAuth($request, 'cancelled', 'Bạn đã huỷ đăng nhập Google.', $intent);
        }

        try {
            /** @var AbstractProvider $provider */
            $provider = Socialite::driver('google');
            $googleUser = $provider->stateless()->user();
        } catch (GuzzleException|InvalidStateException) {
            return $this->failedAuth($request, 'provider_error', 'Không thể xác thực với Google.', $intent);
        }

        if (! $googleUser instanceof SocialiteUser) {
            return $this->failedAuth($request, 'provider_error', 'Không thể xác thực với Google.', $intent);
        }

        $email = $googleUser->getEmail();
        $googleId = $googleUser->getId();

        if (blank($googleId)) {
            return $this->failedAuth(
                $request,
                'provider_error',
                'Tài khoản Google không cung cấp đủ thông tin.',
                $intent,
            );
        }

        if (blank($email)) {
            return $this->failedAuth(
                $request,
                'provider_error',
                'Tài khoản Google không cung cấp email.',
                $intent,
            );
        }

        try {
            $user = $this->resolveUser($googleUser, $googleId, Str::lower(trim($email)));
        } catch (ValidationException $exception) {
            if ($request->expectsJson() || filled($intent['device_name'])) {
                throw $exception;
            }

            $message = collect($exception->errors())->flatten()->first();

            return $this->failedAuth(
                $request,
                'provider_error',
                is_string($message) ? $message : 'Không thể xác thực với Google.',
                $intent,
            );
        }

        return $this->oauthResponse($request, $user, $intent['device_name']);
    }

    /**
     * Find, link or create the local account behind the Google identity.
     */
    private function resolveUser(SocialiteUser $googleUser, string $googleId, string $email): User
    {
        $avatar = $googleUser->getAvatar();
        $avatarUrl = is_string($avatar) && $avatar !== '' ? $avatar : null;
        $providerVerified = $this->isProviderVerified($googleUser);

        $user = User::query()->where('google_id', $googleId)->first();

        if ($user instanceof User) {
            $user->forceFill(['avatar_url' => $user->avatar_url ?? $avatarUrl])->save();

            return $user;
        }

        $existing = User::query()->where('email', $email)->first();

        if ($existing instanceof User) {
            // Only an address Google has verified may take over the account
            // that already owns it; otherwise the identity could be used to
            // sign in as somebody else.
            if (! $providerVerified) {
                throw ValidationException::withMessages([
                    'email' => 'Tài khoản Google chưa xác minh email này.',
                ]);
            }

            if ($existing->google_id !== null && $existing->google_id !== $googleId) {
                throw ValidationException::withMessages([
                    'email' => 'Email đã được liên kết với một tài khoản Google khác.',
                ]);
            }

            $existing->forceFill([
                'google_id' => $googleId,
                'avatar_url' => $existing->avatar_url ?? $avatarUrl,
            ]);

            if (! $existing->hasVerifiedEmail()) {
                $existing->email_verified_at = now();
            }

            $existing->save();

            return $existing;
        }

        $name = $googleUser->getName();
        $name = is_string($name) && $name !== '' ? $name : Str::before($email, '@');

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Str::random(40),
            'google_id' => $googleId,
            'avatar_url' => $avatarUrl,
        ]);

        $user->assignDefaultRole();

        if ($providerVerified) {
            $user->forceFill(['email_verified_at' => now()])->save();
        } else {
            $user->sendEmailVerificationNotification();
        }

        return $user;
    }

    /**
     * Determine whether Google already verified the e-mail address.
     */
    private function isProviderVerified(SocialiteUser $googleUser): bool
    {
        $raw = $googleUser->getRaw();

        return (bool) ($raw['verified_email'] ?? $raw['email_verified'] ?? false);
    }

    /**
     * Issue a token, or hand it to the frontend through the URL fragment.
     */
    private function oauthResponse(Request $request, User $user, ?string $deviceName): JsonResponse|RedirectResponse
    {
        $user->loadMissing('roles');

        $pair = app(AuthTokenService::class)->issue($user, $deviceName ?: 'google');

        if ($request->expectsJson() || filled($deviceName)) {
            return $this->tokenResponse($user, $pair);
        }

        $frontend = rtrim((string) config('app.frontend_url'), '/');

        if ($frontend === '') {
            return $this->tokenResponse($user, $pair);
        }

        return redirect()->away($frontend.'/auth/callback#'.http_build_query([
            'token' => $pair['token'],
            'refresh_token' => $pair['refresh_token'],
            'expires_in' => $pair['expires_in'],
            'token_type' => $pair['token_type'],
        ]));
    }

    /**
     * Build the JSON payload returned to token clients.
     *
     * @param  array{token: string, refresh_token: string, token_type: string, expires_in: int}  $pair
     */
    private function tokenResponse(User $user, array $pair): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => UserResource::make($user),
                ...$pair,
            ],
        ]);
    }

    /**
     * Return a browser callback error to the frontend or preserve the JSON API error.
     *
     * @param  array{device_name: string|null}|null  $intent
     */
    private function failedAuth(
        Request $request,
        string $code,
        string $message,
        ?array $intent = null,
    ): JsonResponse|RedirectResponse {
        if (! $request->expectsJson() && ! filled($intent['device_name'] ?? null)) {
            $frontend = rtrim((string) config('app.frontend_url'), '/');

            if ($frontend !== '') {
                return redirect()->away($frontend.'/auth/callback#'.http_build_query([
                    'error' => $code,
                    'message' => $message,
                ]));
            }
        }

        throw ValidationException::withMessages(['state' => $message]);
    }
}
