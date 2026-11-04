<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Data\Ai\MessageData;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\Cursor;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Contracts\PaginatesConversations;
use Laravel\Ai\Models\Conversation;
use Laravel\Ai\Storage\StoredMessage;

class ConversationMessagesController extends Controller
{
    /**
     * List the messages of a conversation owned by the authenticated user.
     */
    public function __invoke(Request $request, Conversation $conversation, ConversationStore $store): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        abort_unless(Gate::allows('view', $conversation), 404, 'Không tìm thấy hội thoại.');

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        abort_unless($store instanceof PaginatesConversations, 500, 'Conversation store does not support pagination.');

        $paginator = $store->paginateConversationMessages(
            (string) $conversation->getKey(),
            (int) ($validated['per_page'] ?? 20),
        );

        $messages = array_map(
            static fn (StoredMessage $message): array => MessageData::fromStoredMessage($message)->toArray(),
            $paginator->items()
        );

        $nextCursor = $paginator->nextCursor();
        $previousCursor = $paginator->previousCursor();

        return response()->json([
            'data' => $messages,
            'meta' => [
                'next_cursor' => $nextCursor instanceof Cursor ? (string) $nextCursor->encode() : null,
                'prev_cursor' => $previousCursor instanceof Cursor ? (string) $previousCursor->encode() : null,
                'per_page' => (int) $paginator->perPage(),
            ],
        ]);
    }
}
