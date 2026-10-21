<?php

namespace App\Http\Controllers\Api\V1\Auth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Stores the short lived state of an OAuth authorization request.
 *
 * The state travels through the provider and back to the callback, so it is
 * also used to carry the optional device name used to label the issued token.
 */
final class OAuthState
{
    private const CACHE_PREFIX = 'auth:oauth:google:';

    private const TTL_MINUTES = 10;

    /**
     * Store a new OAuth intent and return its state value.
     */
    public static function remember(?string $deviceName): string
    {
        $state = Str::random(40);

        Cache::put(self::CACHE_PREFIX.$state, [
            'device_name' => $deviceName,
        ], now()->addMinutes(self::TTL_MINUTES));

        return $state;
    }

    /**
     * Consume the OAuth intent behind the given state.
     *
     * @return array{device_name: string|null}|null
     */
    public static function pull(mixed $state): ?array
    {
        if (! is_string($state) || $state === '') {
            return null;
        }

        $payload = Cache::pull(self::CACHE_PREFIX.$state);

        if (! is_array($payload)) {
            return null;
        }

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
}
