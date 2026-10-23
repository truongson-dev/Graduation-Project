<?php

namespace App\Http\Controllers\Api\V1\Auth;

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
            throw ValidationException::withMessages([
                'state' => 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
            ]);
        }

        if ($request->query('error') !== null) {
            throw ValidationException::withMessages([
                'state' => 'Bạn đã huỷ đăng nhập Google.',
            ]);
        }

        try {
            /** @var AbstractProvider $provider */
            $provider = Socialite::driver('google');
            $googleUser = $provider->stateless()->user();
        } catch (GuzzleException|InvalidStateException) {
            throw ValidationException::withMessages([
                'state' => 'Không thể xác thực với Google.',
            ]);
        }

        if (! $googleUser instanceof SocialiteUser) {
            throw ValidationException::withMessages([
                'state' => 'Không thể xác thực với Google.',
            ]);
        }

        $email = $googleUser->getEmail();
        $googleId = $googleUser->getId();

        if (blank($googleId)) {
            throw ValidationException::withMessages([
                'state' => 'Tài khoản Google không cung cấp đủ thông tin.',
            ]);
        }

        if (blank($email)) {
            throw ValidationException::withMessages([
                'email' => 'Tài khoản Google không cung cấp email.',
            ]);
        }

        $user = $this->resolveUser($googleUser, $googleId, Str::lower(trim($email)));

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

        $token = $user->createToken($deviceName ?: 'google')->plainTextToken;

        if ($request->expectsJson() || filled($deviceName)) {
            return $this->tokenResponse($user, $token);
        }

        $frontend = rtrim((string) config('app.frontend_url'), '/');

        if ($frontend === '') {
            return $this->tokenResponse($user, $token);
        }

        return redirect()->away($frontend.'/auth/callback#'.http_build_query([
            'token' => $token,
            'token_type' => 'Bearer',
        ]));
    }

    /**
     * Build the JSON payload returned to token clients.
     */
    private function tokenResponse(User $user, string $token): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => UserResource::make($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }
}
