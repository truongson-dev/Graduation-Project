<?php

namespace App\Http\Controllers\Api\V1\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Stores the short lived state of an OAuth authorization request.
 *
 * The state travels through the provider and back to the callback, so it is
 * also used to carry the optional device name used to label the issued token.
 * The intent is bound to the client that started it, so a callback captured by
 * another browser cannot be replayed there to sign the victim into the
 * attacker's account.
 */
final class OAuthState
{
    private const CACHE_PREFIX = 'auth:oauth:google:';

    private const TTL_MINUTES = 10;

    /**
     * Store a new OAuth intent and return its state value.
     */
    public static function remember(Request $request, ?string $deviceName): string
    {
        $state = Str::random(40);

        Cache::put(self::CACHE_PREFIX.$state, [
            'device_name' => $deviceName,
            'client' => self::clientFingerprint($request),
        ], now()->addMinutes(self::TTL_MINUTES));

        return $state;
    }

    /**
     * Consume the OAuth intent behind the given state.
     *
     * @return array{device_name: string|null}|null
     */
    public static function pull(mixed $state, Request $request): ?array
    {
        if (! is_string($state) || $state === '') {
            return null;
        }

        $key = self::CACHE_PREFIX.$state;
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            return null;
        }

        $client = $payload['client'] ?? null;

        if (! is_string($client) || ! hash_equals($client, self::clientFingerprint($request))) {
            return null;
        }

        Cache::forget($key);

        $deviceName = $payload['device_name'] ?? null;

        return ['device_name' => is_string($deviceName) ? $deviceName : null];
    }

    /**
     * Get the number of seconds an OAuth intent stays valid.
     */
    public static function ttlSeconds(): int
    {
        return self::TTL_MINUTES * 60;
    }

    /**
     * Build a fingerprint of the client that started the authorization request.
     *
     * The session identifier binds browser (SPA) flows; the IP address binds
     * stateless clients such as the mobile application.
     */
    private static function clientFingerprint(Request $request): string
    {
        $sessionId = $request->hasSession() ? $request->session()->getId() : '';

        return hash('sha256', $sessionId.'|'.($request->ip() ?? 'unknown'));
    }
}
