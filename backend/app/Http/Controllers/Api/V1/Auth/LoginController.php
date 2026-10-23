<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
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

        $user = User::query()->where('email', $validated['email'])->first();

        // Hash a throwaway value when the account is missing, so both outcomes
        // cost the same and the response cannot be timed to enumerate emails.
        $passwordHash = $user instanceof User ? $user->password : Hash::make(Str::random(16));
        $passwordIsValid = Hash::check($validated['password'], $passwordHash);

        if (! $user instanceof User || ! $passwordIsValid) {
            throw ValidationException::withMessages([
                'email' => 'Thông tin đăng nhập không chính xác.',
            ]);
        }

        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => $validated['password']])->save();
        }

        $deviceName = $validated['device_name'] ?? null;

        return $this->authenticatedResponse($request, $user, is_string($deviceName) ? $deviceName : null);
    }
}
