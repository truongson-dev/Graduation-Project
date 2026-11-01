<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Auth\AuthTokenService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\TransientToken;

class LogoutController extends Controller
{
    /**
     * Revoke the current access token, refresh token family, or invalidate the current session.
     */
    public function __invoke(Request $request, AuthTokenService $tokens): Response
    {
        $user = $request->user('sanctum') ?? $request->user();
        $refreshToken = $request->input('refresh_token');
        $hasRevokedRefreshToken = false;

        if (is_string($refreshToken) && filled($refreshToken)) {
            $hasRevokedRefreshToken = $tokens->revokeByRefreshToken($refreshToken);
        }

        if ($user instanceof User) {
            /** @var PersonalAccessToken|TransientToken|null $accessToken */
            $accessToken = $user->currentAccessToken();

            if ($accessToken instanceof PersonalAccessToken) {
                $tokens->revokeForAccessToken($user, $accessToken);
                $accessToken->delete();
            }

            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->noContent();
        }

        if ($hasRevokedRefreshToken) {
            return response()->noContent();
        }

        abort(401);
    }
}
