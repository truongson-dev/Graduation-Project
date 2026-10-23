<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Http\Controllers\Controller;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Ai\Models\Conversation;

class ConversationIndexController extends Controller
{
    /**
     * List the authenticated user's AI conversations.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $paginator = $user->conversations()
            ->latest('updated_at')
            ->cursorPaginate((int) ($validated['per_page'] ?? 20));

        $conversations = array_map(function (Conversation $conversation): array {
            $attributes = $conversation->toArray();

            return [
                'id' => (string) $attributes['id'],
                'title' => (string) $attributes['title'],
                'created_at' => $this->toIso8601($attributes['created_at'] ?? null),
                'updated_at' => $this->toIso8601($attributes['updated_at'] ?? null),
            ];
        }, $paginator->items());

        return response()->json([
            'data' => $conversations,
            'meta' => [
                'next_cursor' => $paginator->nextCursor()?->encode(),
                'prev_cursor' => $paginator->previousCursor()?->encode(),
                'per_page' => $paginator->perPage(),
            ],
        ]);
    }

    /**
     * Format a date attribute as an ISO 8601 string.
     */
    private function toIso8601(mixed $value): ?string
    {
        return $value instanceof DateTimeInterface ? $value->format(DateTimeInterface::ATOM) : null;
    }
}
