<?php

namespace App\Data\Ai;

use Laravel\Ai\Storage\StoredMessage;
use Spatie\LaravelData\Data;

class MessageData extends Data
{
    public function __construct(
        public string $id,
        public string $role,
        public string $content,
        public string $status,
        public ?string $created_at,
    ) {}

    public static function fromStoredMessage(StoredMessage $message): self
    {
        return new self(
            id: $message->id,
            role: $message->role,
            content: $message->content,
            status: $message->status->value,
            created_at: $message->createdAt?->toIso8601String(),
        );
    }
}
