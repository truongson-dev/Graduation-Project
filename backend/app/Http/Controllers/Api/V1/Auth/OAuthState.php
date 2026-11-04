<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Data\Auth\OAuthIntentData;
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
     */
    public static function pull(mixed $state, Request $request): ?OAuthIntentData
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

        return new OAuthIntentData(
            device_name: is_string($deviceName) ? $deviceName : null,
            client: $client,
        );
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
     * The IP address binds both browser (SPA) flows and stateless clients (such
     * as mobile applications). The session ID cannot be used here because the
     * callback arrives as a redirection from Google (referer: accounts.google.com),
     * where Sanctum's stateful SPA middleware intentionally does not execute.
     */
    private static function clientFingerprint(Request $request): string
    {
        return hash('sha256', (string) ($request->ip() ?? 'unknown'));
    }
}
