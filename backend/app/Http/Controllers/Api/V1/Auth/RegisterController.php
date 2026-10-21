<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    use HandlesAuthentication;

    /**
     * Register a new account for a first-party or token client.
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $deviceName = $validated['device_name'] ?? null;
        unset($validated['device_name']);

        $user = User::create($validated);
        $user->assignDefaultRole();
        $user->sendEmailVerificationNotification();

        return $this->authenticatedResponse(
            $request,
            $user,
            is_string($deviceName) ? $deviceName : null,
            201,
        );
    }
}
