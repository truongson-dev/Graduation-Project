<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
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

        if (! $user instanceof User || ! Hash::check($validated['password'], $user->password)) {
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
