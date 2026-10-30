<?php

namespace App\Http\Controllers\Concerns;

use App\Auth\AuthTokenService;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait HandlesAuthentication
{
    /**
     * Build the authentication response for both first-party and token clients.
     *
     * Stateful (SPA) requests authenticate through the session cookie while
     * requests that ask for a device name, or that have no session, receive a
     * Sanctum personal access token.
     */
    protected function authenticatedResponse(
        Request $request,
        User $user,
        ?string $deviceName = null,
        int $status = 200,
    ): JsonResponse {
        $user->loadMissing('roles');

        if (filled($deviceName) || ! $request->hasSession()) {
            return response()->json([
                'data' => [
                    'user' => UserResource::make($user),
                    ...app(AuthTokenService::class)->issue($user, $deviceName ?: 'api'),
                ],
            ], $status);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'data' => ['user' => UserResource::make($user)],
        ], $status);
    }
}
