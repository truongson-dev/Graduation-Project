<?php

namespace App\Data\Ai;

use DateTimeInterface;
use Laravel\Ai\Models\Conversation;
use Spatie\LaravelData\Data;

class ConversationData extends Data
{
    public function __construct(
        public string $id,
        public string $title,
        public ?string $created_at,
        public ?string $updated_at,
    ) {}

    public static function fromModel(Conversation $conversation): self
    {
        $attributes = $conversation->toArray();

        return new self(
            id: (string) $attributes['id'],
            title: (string) $attributes['title'],
            created_at: self::toIso8601($attributes['created_at'] ?? null),
            updated_at: self::toIso8601($attributes['updated_at'] ?? null),
        );
    }

    private static function toIso8601(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        if (is_string($value) && $value !== '') {
            $timestamp = strtotime($value);

            return $timestamp !== false ? date('c', $timestamp) : $value;
        }

        return null;
    }
}
