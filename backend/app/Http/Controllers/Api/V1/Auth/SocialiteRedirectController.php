<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\AbstractProvider;

class SocialiteRedirectController extends Controller
{
    /**
     * Return the Google authorization URL for a SPA or mobile client.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        abort_unless(
            filled(config('services.google.client_id')),
            503,
            'Đăng nhập Google chưa được cấu hình.',
        );

        $deviceName = $validated['device_name'] ?? null;
        $state = OAuthState::remember($request, is_string($deviceName) ? $deviceName : null);

        /** @var AbstractProvider $provider */
        $provider = Socialite::driver('google');

        $url = $provider
            ->stateless()
            ->with(['state' => $state])
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'data' => [
                'url' => $url,
                'state' => $state,
                'expires_in' => OAuthState::ttlSeconds(),
            ],
        ]);
    }
}
