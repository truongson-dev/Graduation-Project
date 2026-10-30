<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    use HandlesAuthentication;

    /**
     * Authenticate a first-party or token client.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = $validated['email'];
        $lockKey = $this->lockKey($email);
        $attemptsKey = $this->attemptsKey($email);

        $lockedUntil = Cache::get($lockKey);

        if (is_numeric($lockedUntil)) {
            return $this->lockedResponse(max(1, (int) $lockedUntil - now()->timestamp));
        }

        $user = User::query()->where('email', $email)->first();

        // Hash a throwaway value when the account is missing, so both outcomes
        // cost the same and the response cannot be timed to enumerate emails.
        $passwordHash = $user instanceof User ? $user->password : Hash::make(Str::random(16));
        $passwordIsValid = Hash::check($validated['password'], $passwordHash);

        if (! $user instanceof User || ! $passwordIsValid) {
            Cache::add($attemptsKey, 0, now()->addMinutes(15));
            $attempts = Cache::increment($attemptsKey);

            if ($attempts >= 5) {
                Cache::forget($attemptsKey);
                $lockedUntil = now()->addMinutes(15);
                Cache::put($lockKey, $lockedUntil->timestamp, $lockedUntil);

                return $this->lockedResponse();
            }

            throw ValidationException::withMessages([
                'email' => 'Thông tin đăng nhập không chính xác.',
            ]);
        }

        Cache::forget($attemptsKey);
        Cache::forget($lockKey);

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

    private function lockKey(string $email): string
    {
        return 'auth:login:locked:'.hash('sha256', $email);
    }

    private function attemptsKey(string $email): string
    {
        return 'auth:login:attempts:'.hash('sha256', $email);
    }
}
