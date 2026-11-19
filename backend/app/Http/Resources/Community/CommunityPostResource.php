<?php

namespace App\Http\Resources\Community;

use App\Models\CommunityPollOption;
use App\Models\CommunityPost;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin CommunityPost
 */
class CommunityPostResource extends JsonResource
{
    /**
     * @param  array<int, array<string, mixed>>  $viewerContext
     * @param  Collection<int, Collection<int, CommunityPost>>|null  $selfThreads
     */
    public function __construct(
        mixed $resource,
        private readonly array $viewerContext = [],
        private readonly ?Collection $selfThreads = null,
    ) {
        parent::__construct($resource);
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CommunityPost $post */
        $post = $this->resource;
        $ctx = $this->viewerContext[$post->id] ?? [
            'liked' => false,
            'bookmarked' => false,
            'reposted' => false,
            'following' => false,
            'poll_votes' => [],
        ];

        $pollData = null;
        if ($post->relationLoaded('poll') && $post->poll !== null) {
            $poll = $post->poll;
            $pollVotesMap = is_array($ctx['poll_votes'] ?? null) ? $ctx['poll_votes'] : [];
            $selectedOptionId = $pollVotesMap[$poll->id] ?? null;

            $pollData = [
                'id' => $poll->id,
                'question' => $poll->question,
                'expires_at' => $this->toIso8601($poll->expires_at),
                'total_votes' => $poll->total_votes,
                'viewer_selected_option_id' => $selectedOptionId !== null ? (int) $selectedOptionId : null,
                'options' => $poll->relationLoaded('options')
                    ? $poll->options->map(static fn (CommunityPollOption $option): array => [
                        'id' => $option->id,
                        'label' => $option->label,
                        'votes_count' => $option->votes_count,
                        'sort_order' => $option->sort_order,
                    ])->values()->all()
                    : [],
            ];
        }

        $selfThreadItems = [];
        if ($this->selfThreads !== null && $this->selfThreads->has($post->id)) {
            $selfThreadItems = $this->selfThreads->get($post->id)
                ->map(fn (CommunityPost $item): array => (new self($item, $this->viewerContext))->toArray($request))
                ->values()
                ->all();
        }

        $repostOfData = null;
        if ($post->relationLoaded('repostOf') && $post->repostOf !== null) {
            $repostOfData = (new self($post->repostOf, $this->viewerContext, $this->selfThreads))->toArray($request);
        }

        $quotePostData = null;
        if ($post->relationLoaded('quotePost') && $post->quotePost !== null) {
            $quotePostData = (new self($post->quotePost, $this->viewerContext))->toArray($request);
        }

        return [
            'id' => $post->id,
            'root_id' => $post->root_id,
            'parent_id' => $post->parent_id,
            'thread_group_id' => $post->thread_group_id,
            'depth' => $post->depth,
            'body' => $post->body,
            'reply_control' => $post->reply_control->value,
            'status' => $post->status->value,
            'is_hidden_by_author' => $post->is_hidden_by_author,
            'likes_count' => $post->likes_count,
            'replies_count' => $post->replies_count,
            'reposts_count' => $post->reposts_count,
            'quotes_count' => $post->quotes_count,
            'hot_score' => (string) $post->hot_score,
            'created_at' => $this->toIso8601($post->created_at),
            'author' => $post->relationLoaded('author') && $post->author !== null
                ? (new CommunityAuthorResource($post->author))->toArray($request)
                : null,
            'topic_tag' => $post->relationLoaded('topicTag') && $post->topicTag !== null
                ? (new CommunityTopicTagResource($post->topicTag))->toArray($request)
                : null,
            'poll' => $pollData,
            'repost_of' => $repostOfData,
            'quote_post' => $quotePostData,
            'self_thread_items' => $selfThreadItems,
            'viewer' => [
                'liked' => (bool) ($ctx['liked'] ?? false),
                'bookmarked' => (bool) ($ctx['bookmarked'] ?? false),
                'reposted' => (bool) ($ctx['reposted'] ?? false),
                'following' => (bool) ($ctx['following'] ?? false),
            ],
        ];
    }

    private function toIso8601(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format(DateTimeInterface::ATOM);
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
