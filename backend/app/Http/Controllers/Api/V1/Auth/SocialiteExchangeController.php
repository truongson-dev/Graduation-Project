<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class SocialiteExchangeController extends Controller
{
    use HandlesAuthentication;

    /**
     * Exchange a one-time OAuth code for a cookie session.
     *
     * The Google callback cannot create a session directly because the
     * redirect originates from Google, not from the SPA domain, so
     * Sanctum's stateful middleware is not active.  The frontend calls
     * this endpoint (from its own origin) after receiving the code,
     * which ensures the session middleware is in place.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'min:40', 'max:40'],
        ]);

        $cacheKey = 'auth:oauth:exchange:'.hash('sha256', $validated['code']);
        $userId = Cache::pull($cacheKey);

        if ($userId === null) {
            throw ValidationException::withMessages([
                'code' => 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
            ]);
        }

        $user = User::findOrFail($userId);

        return $this->authenticatedResponse($request, $user);
    }
}
