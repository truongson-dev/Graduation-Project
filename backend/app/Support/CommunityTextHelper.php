<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

class CommunityTextHelper
{
    /**
     * Default MySQL InnoDB FULLTEXT stopwords that frequently collide with unaccented Vietnamese words.
     *
     * @var array<string, true>
     */
    private const INNODB_STOPWORDS = [
        'a' => true, 'about' => true, 'an' => true, 'are' => true, 'as' => true, 'at' => true,
        'be' => true, 'by' => true, 'com' => true, 'de' => true, 'en' => true, 'for' => true,
        'from' => true, 'how' => true, 'i' => true, 'in' => true, 'is' => true, 'it' => true,
        'la' => true, 'of' => true, 'on' => true, 'or' => true, 'that' => true, 'the' => true,
        'this' => true, 'to' => true, 'was' => true, 'what' => true, 'when' => true, 'where' => true,
        'who' => true, 'will' => true, 'with' => true, 'und' => true, 'www' => true,
    ];

    /**
     * Normalize Vietnamese text into lowercase ASCII for full-text indexing.
     */
    public static function normalizeForSearch(string $text): string
    {
        $ascii = Str::of($text)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^\p{L}\p{N}\s]+/u', ' ')
            ->squish()
            ->toString();

        return Str::limit($ascii, 600, '');
    }

    /**
     * Escape SQL LIKE wildcard characters using '!' as the portable escape character.
     */
    public static function escapeLike(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }

    /**
     * Sanitize user input into safe InnoDB FULLTEXT boolean mode tokens (>= 3 chars, excluding stopwords).
     */
    public static function sanitizeBooleanSearchTokens(string $query): string
    {
        $normalized = self::normalizeForSearch($query);

        if ($normalized === '') {
            return '';
        }

        $words = array_values(array_filter(
            explode(' ', $normalized),
            static fn (string $word): bool => mb_strlen($word) >= 3 && ! isset(self::INNODB_STOPWORDS[$word])
        ));

        if ($words === []) {
            return '';
        }

        $tokens = array_map(
            static fn (string $word): string => '+'.$word.'*',
            array_slice($words, 0, 8)
        );

        return implode(' ', $tokens);
    }

    /**
     * Build a deterministic default handle for a user without a community profile.
     */
    public static function defaultUsernameFor(User $user): string
    {
        $base = Str::of($user->name)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '')
            ->limit(24, '')
            ->toString();

        if ($base === '') {
            $base = 'hocvien';
        }

        return $base.$user->id;
    }
}
