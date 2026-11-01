<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    use HandlesAuthentication;

    private const MAX_ATTEMPTS = 5;

    private const DECAY_SECONDS = 900;

    /**
     * Authenticate a first-party or token client.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = $validated['email'];
        $throttleKey = $this->throttleKey($email);

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            return $this->lockedResponse(RateLimiter::availableIn($throttleKey));
        }

        $user = User::query()->where('email', $email)->first();

        // Hash a throwaway value when the account is missing, so both outcomes
        // cost the same and the response cannot be timed to enumerate emails.
        $passwordHash = $user instanceof User ? $user->password : Hash::make(Str::random(16));
        $passwordIsValid = Hash::check($validated['password'], $passwordHash);

        if (! $user instanceof User || ! $passwordIsValid) {
            $hits = RateLimiter::hit($throttleKey, self::DECAY_SECONDS);

            if ($hits >= self::MAX_ATTEMPTS) {
                return $this->lockedResponse(RateLimiter::availableIn($throttleKey));
            }

            throw ValidationException::withMessages([
                'email' => 'Thông tin đăng nhập không chính xác.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => $validated['password']])->save();
        }

        $deviceName = $validated['device_name'] ?? null;

        return $this->authenticatedResponse($request, $user, is_string($deviceName) ? $deviceName : null);
    }

    /**
     * Return a lockout response with the remaining wait time.
     */
    private function lockedResponse(int $retryAfterSeconds = 900): JsonResponse
    {
        $minutes = (int) ceil($retryAfterSeconds / 60);
        $message = $minutes === 15
            ? 'Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau 15 phút.'
            : "Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau {$minutes} phút.";

        return response()->json([
            'message' => $message,
            'errors' => ['email' => [$message]],
            'retry_after_seconds' => $retryAfterSeconds,
        ], 423)->header('Retry-After', (string) $retryAfterSeconds);
    }

    private function throttleKey(string $email): string
    {
        return 'auth:login:throttle:'.hash('sha256', Str::lower(trim($email)));
    }
}
