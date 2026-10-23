<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Ai\Agents\SoftSkillCoach;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\ChatRequest;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Exceptions\RateLimitedException;
use Laravel\Ai\Models\Conversation;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ChatController extends Controller
{
    /**
     * Stream a coach reply for the authenticated user.
     *
     * The reply uses server-sent events: one JSON object per data frame, starting with a
     * "meta" frame carrying the conversation ID and ending with a "done" frame. Provider
     * failures after the stream has started are reported as an "error" frame.
     */
    public function __invoke(ChatRequest $request, ConversationStore $store): StreamedResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        $validated = $request->validated();
        $message = (string) $validated['message'];
        $conversationId = is_string($validated['conversation_id'] ?? null)
            ? $validated['conversation_id']
            : null;

        if ($conversationId === null) {
            $conversationId = $store->storeConversation(
                Conversation::participantType($user),
                Conversation::participantKey($user),
                Str::limit($message, 60),
            );
        } else {
            $conversation = Conversation::query()->findOrFail($conversationId);

            abort_unless(Gate::allows('view', $conversation), 404, 'Không tìm thấy hội thoại.');
        }

        $stream = (new SoftSkillCoach)
            ->continue($conversationId, as: $user)
            ->stream($message);

        return response()->stream(function () use ($stream, $conversationId): void {
            $this->emit(['type' => 'meta', 'conversation_id' => $conversationId]);

            try {
                foreach ($stream as $event) {
                    $this->emit($event->toArray());
                }

                $this->emit([
                    'type' => 'done',
                    'conversation_id' => $stream->conversationId ?? $conversationId,
                    'assistant_message_id' => $stream->assistantMessageId,
                ]);
            } catch (Throwable $exception) {
                report($exception);

                $this->emit([
                    'type' => 'error',
                    'code' => $exception instanceof RateLimitedException ? 'ai_rate_limited' : 'ai_failed',
                    'message' => $exception instanceof RateLimitedException
                        ? 'Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.'
                        : 'Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại.',
                ]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Write one server-sent event frame and flush it to the client.
     *
     * @param  array<string, mixed>  $payload
     */
    private function emit(array $payload): void
    {
        echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";

        if (ob_get_level() > 0) {
            ob_flush();
        }

        flush();
    }
}
