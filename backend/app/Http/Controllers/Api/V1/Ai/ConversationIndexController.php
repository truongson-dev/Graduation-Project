<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Data\Ai\ConversationData;
use App\Http\Controllers\Controller;
use App\Models\User;
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

        $conversations = array_map(
            static fn (Conversation $conversation): array => ConversationData::fromModel($conversation)->toArray(),
            $paginator->items()
        );

        return response()->json([
            'data' => $conversations,
            'meta' => [
                'next_cursor' => $paginator->nextCursor()?->encode(),
                'prev_cursor' => $paginator->previousCursor()?->encode(),
                'per_page' => $paginator->perPage(),
            ],
        ]);
    }
}
