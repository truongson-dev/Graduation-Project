<?php

namespace App\Services\Community;

use App\Enums\CommunityPostStatus;
use App\Enums\CommunityReactionType;
use App\Enums\ReplyControl;
use App\Models\CommunityPoll;
use App\Models\CommunityPollOption;
use App\Models\CommunityPost;
use App\Models\CommunityTopicTag;
use App\Models\User;
use App\Support\CommunityTextHelper;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CommunityWriteService
{
    public function __construct(
        private readonly CommunityTrendingService $trendingService,
    ) {}

    /**
     * Create a single root post or a multi-part author self-thread.
     *
     * @param  array{
     *     items: list<array{body: string}>,
     *     topic_tag_id?: int|null,
     *     quote_post_id?: int|null,
     *     reply_control?: string|null,
     *     poll?: array{question?: string|null, options: list<string>, expires_in_hours?: int|null}|null
     * }  $data
     */
    public function createThread(User $author, array $data): CommunityPost
    {
        $post = DB::transaction(function () use ($author, $data): CommunityPost {
            $items = $data['items'];
            $topicTagId = $data['topic_tag_id'] ?? null;
            $quotePostId = isset($data['quote_post_id']) ? (int) $data['quote_post_id'] : null;
            $replyControl = ReplyControl::tryFrom((string) ($data['reply_control'] ?? 'everyone')) ?? ReplyControl::Everyone;

            $quotedPost = null;
            if ($quotePostId !== null) {
                $quotedPost = CommunityPost::query()->find($quotePostId);
                if (
                    $quotedPost === null
                    || $quotedPost->status !== CommunityPostStatus::Published
                    || $quotedPost->is_hidden_by_author
                ) {
                    throw ValidationException::withMessages([
                        'quote_post_id' => ['Bài viết được trích dẫn không còn khả dụng.'],
                    ]);
                }
            }

            /** @var CommunityPost|null $rootPost */
            $rootPost = null;
            /** @var CommunityPost|null $previousPost */
            $previousPost = null;

            foreach ($items as $index => $item) {
                $body = trim($item['body']);
                $post = CommunityPost::query()->create([
                    'user_id' => $author->id,
                    'root_id' => $rootPost?->id,
                    'parent_id' => $previousPost?->id,
                    'thread_group_id' => $rootPost?->id,
                    'depth' => $index,
                    'quote_post_id' => $index === 0 ? $quotedPost?->id : null,
                    'topic_tag_id' => $index === 0 ? $topicTagId : null,
                    'body' => $body,
                    'body_search' => CommunityTextHelper::normalizeForSearch($body),
                    'reply_control' => $replyControl,
                    'status' => CommunityPostStatus::Published,
                    'hot_score' => $this->computeHotScore(0, 0, 0, 0, 0),
                ]);

                if ($index === 0) {
                    $rootPost = $post;
                    if (count($items) > 1) {
                        $post->update(['thread_group_id' => $post->id]);
                    }
                }

                $previousPost = $post;
            }

            if ($quotedPost !== null) {
                CommunityPost::query()->whereKey($quotedPost->id)->increment('quotes_count');
                $this->recalculateHotScore($quotedPost->root_id ?? $quotedPost->id);
            }

            if ($rootPost !== null && isset($data['poll'])) {
                $pollData = $data['poll'];
                $expiresHours = $pollData['expires_in_hours'] ?? null;

                $poll = CommunityPoll::query()->create([
                    'post_id' => $rootPost->id,
                    'question' => isset($pollData['question']) && trim((string) $pollData['question']) !== ''
                        ? trim((string) $pollData['question'])
                        : null,
                    'expires_at' => $expiresHours !== null ? now()->addHours((int) $expiresHours) : null,
                    'total_votes' => 0,
                ]);

                foreach ($pollData['options'] as $order => $label) {
                    CommunityPollOption::query()->create([
                        'poll_id' => $poll->id,
                        'label' => trim($label),
                        'votes_count' => 0,
                        'sort_order' => $order,
                    ]);
                }
            }

            if ($topicTagId !== null) {
                CommunityTopicTag::query()
                    ->where('id', $topicTagId)
                    ->increment('posts_count');
            }

            assert($rootPost !== null);

            $fresh = $rootPost->fresh([
                'author.communityProfile',
                'topicTag',
                'poll.options',
                'quotePost.author.communityProfile',
                'quotePost.topicTag',
            ]) ?? $rootPost;

            return $fresh;
        }, 3);

        $this->trendingService->forgetCache();

        return $post;
    }

    /**
     * Create a reply to an existing post while enforcing the root post's reply_control policy.
     *
     * @param  array{body: string}  $data
     *
     * @throws AuthorizationException
     */
    public function createReply(User $author, CommunityPost $parent, array $data): CommunityPost
    {
        $targetParent = $this->resolvePublishableTarget($parent, 'Bài viết không còn khả dụng để trả lời.');

        $rootPost = $targetParent->root_id !== null
            ? CommunityPost::query()->find($targetParent->root_id)
            : $targetParent;

        if (
            $rootPost === null
            || $rootPost->status !== CommunityPostStatus::Published
            || $rootPost->is_hidden_by_author
        ) {
            throw ValidationException::withMessages([
                'post' => ['Bài viết gốc không còn khả dụng để trả lời.'],
            ]);
        }

        $this->assertCanReply($author, $rootPost);

        return DB::transaction(function () use ($author, $targetParent, $rootPost, $data): CommunityPost {
            $freshParent = CommunityPost::query()->whereKey($targetParent->id)->lockForUpdate()->first();
            $freshRoot = $rootPost->id === $targetParent->id
                ? $freshParent
                : CommunityPost::query()->whereKey($rootPost->id)->lockForUpdate()->first();

            if (
                $freshParent === null
                || $freshParent->status !== CommunityPostStatus::Published
                || $freshParent->is_hidden_by_author
                || $freshRoot === null
                || $freshRoot->status !== CommunityPostStatus::Published
            ) {
                throw ValidationException::withMessages([
                    'post' => ['Bài viết không còn khả dụng để trả lời.'],
                ]);
            }

            $body = trim($data['body']);
            $isSubstantive = mb_strlen($body) >= 30;

            $reply = CommunityPost::query()->create([
                'user_id' => $author->id,
                'root_id' => $freshRoot->id,
                'parent_id' => $freshParent->id,
                'depth' => min(255, $freshParent->depth + 1),
                'body' => $body,
                'body_search' => CommunityTextHelper::normalizeForSearch($body),
                'reply_control' => $freshRoot->reply_control,
                'status' => CommunityPostStatus::Published,
            ]);

            CommunityPost::query()
                ->where('id', $freshParent->id)
                ->increment('replies_count');

            if ($freshRoot->id !== $freshParent->id) {
                CommunityPost::query()
                    ->where('id', $freshRoot->id)
                    ->increment('replies_count');
            }

            if ($isSubstantive) {
                CommunityPost::query()
                    ->where('id', $freshRoot->id)
                    ->increment('substantive_replies_count');
            }

            $this->recalculateHotScore($freshRoot->id);

            return $reply->fresh(['author.communityProfile', 'topicTag', 'poll.options']) ?? $reply;
        }, 3);
    }

    /**
     * Toggle like or bookmark reaction without gap-lock race conditions.
     *
     * @return array{post_id: int, active: bool, likes_count: int}
     */
    public function toggleReaction(User $viewer, CommunityPost $post, CommunityReactionType $type): array
    {
        $targetPost = $this->resolvePublishableTarget($post, 'Bài viết không khả dụng.');
        $isRootPost = $targetPost->root_id === null && $targetPost->depth === 0;

        return DB::transaction(function () use ($viewer, $targetPost, $type, $isRootPost): array {
            $deleted = DB::table('community_post_reactions')
                ->where('user_id', $viewer->id)
                ->where('post_id', $targetPost->id)
                ->where('type', $type->value)
                ->delete();

            if ($deleted > 0) {
                if ($type === CommunityReactionType::Like) {
                    $this->decrementFloorZero('community_posts', $targetPost->id, 'likes_count');
                    if ($isRootPost) {
                        $this->recalculateHotScore($targetPost->id);
                    }
                }

                return [
                    'post_id' => $targetPost->id,
                    'active' => false,
                    'likes_count' => (int) CommunityPost::query()->whereKey($targetPost->id)->value('likes_count'),
                ];
            }

            $inserted = DB::table('community_post_reactions')->insertOrIgnore([
                'user_id' => $viewer->id,
                'post_id' => $targetPost->id,
                'type' => $type->value,
                'created_at' => now(),
            ]);

            if ($inserted > 0 && $type === CommunityReactionType::Like) {
                CommunityPost::query()->whereKey($targetPost->id)->increment('likes_count');
                if ($isRootPost) {
                    $this->recalculateHotScore($targetPost->id);
                }
            }

            return [
                'post_id' => $targetPost->id,
                'active' => true,
                'likes_count' => (int) CommunityPost::query()->whereKey($targetPost->id)->value('likes_count'),
            ];
        }, 3);
    }

    /**
     * Toggle pure repost on a published root post.
     *
     * @return array{post_id: int, active: bool, reposts_count: int}
     */
    public function toggleRepost(User $viewer, CommunityPost $post): array
    {
        $targetPost = $this->resolvePublishableTarget($post, 'Bài viết gốc không khả dụng để đăng lại.');

        if ($targetPost->depth > 0 || $targetPost->root_id !== null) {
            throw ValidationException::withMessages([
                'post' => ['Chỉ có thể đăng lại bài viết gốc, không thể đăng lại bình luận.'],
            ]);
        }

        return DB::transaction(function () use ($viewer, $targetPost): array {
            // Serialize concurrent repost toggles by the same user without contending on the target post
            DB::table('users')->where('id', $viewer->id)->lockForUpdate()->first();

            $existing = CommunityPost::query()
                ->where('user_id', $viewer->id)
                ->where('repost_of_id', $targetPost->id)
                ->where('status', CommunityPostStatus::Published->value)
                ->first();

            if ($existing !== null) {
                $existing->update(['status' => CommunityPostStatus::Deleted]);
                $existing->delete();
                $this->decrementFloorZero('community_posts', $targetPost->id, 'reposts_count');
                $this->recalculateHotScore($targetPost->root_id ?? $targetPost->id);

                return [
                    'post_id' => $targetPost->id,
                    'active' => false,
                    'reposts_count' => (int) CommunityPost::query()->whereKey($targetPost->id)->value('reposts_count'),
                ];
            }

            CommunityPost::query()->create([
                'user_id' => $viewer->id,
                'depth' => 0,
                'repost_of_id' => $targetPost->id,
                'status' => CommunityPostStatus::Published,
                'hot_score' => $this->computeHotScore(0, 0, 0, 0, 0, now()->timestamp, -1.0),
            ]);

            CommunityPost::query()->whereKey($targetPost->id)->increment('reposts_count');
            $this->recalculateHotScore($targetPost->root_id ?? $targetPost->id);

            return [
                'post_id' => $targetPost->id,
                'active' => true,
                'reposts_count' => (int) CommunityPost::query()->whereKey($targetPost->id)->value('reposts_count'),
            ];
        }, 3);
    }

    /**
     * Cast or switch a poll vote atomically without AB-BA deadlocks.
     *
     * @return array{poll_id: int, selected_option_id: int, total_votes: int, options: list<array{id: int, label: string, votes_count: int, sort_order: int}>}
     */
    public function votePoll(User $viewer, CommunityPoll $poll, int $optionId): array
    {
        $post = CommunityPost::query()->find($poll->post_id);
        if (
            $post === null
            || $post->status !== CommunityPostStatus::Published
            || $post->is_hidden_by_author
        ) {
            throw ValidationException::withMessages([
                'poll' => ['Bài viết chứa bình chọn này không còn khả dụng.'],
            ]);
        }

        if ($poll->expires_at !== null && $poll->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'poll' => ['Bình chọn này đã kết thúc.'],
            ]);
        }

        $optionExists = CommunityPollOption::query()
            ->where('id', $optionId)
            ->where('poll_id', $poll->id)
            ->exists();

        if (! $optionExists) {
            throw ValidationException::withMessages([
                'option_id' => ['Phương án bình chọn không hợp lệ.'],
            ]);
        }

        DB::transaction(function () use ($viewer, $poll, $optionId): void {
            $existingVote = DB::table('community_poll_votes')
                ->where('user_id', $viewer->id)
                ->where('poll_id', $poll->id)
                ->lockForUpdate()
                ->first();

            if ($existingVote !== null) {
                $oldOptionId = (int) $existingVote->option_id;
                if ($oldOptionId === $optionId) {
                    return;
                }

                DB::table('community_poll_votes')
                    ->where('user_id', $viewer->id)
                    ->where('poll_id', $poll->id)
                    ->update(['option_id' => $optionId]);

                if (DB::getDriverName() === 'mysql') {
                    DB::statement(
                        'UPDATE community_poll_options SET votes_count = CASE WHEN id = ? THEN GREATEST(0, votes_count - 1) WHEN id = ? THEN votes_count + 1 END WHERE id IN (?, ?) AND poll_id = ?',
                        [$oldOptionId, $optionId, $oldOptionId, $optionId, $poll->id]
                    );
                } else {
                    $this->decrementFloorZero('community_poll_options', $oldOptionId, 'votes_count');
                    CommunityPollOption::query()->whereKey($optionId)->increment('votes_count');
                }

                return;
            }

            DB::table('community_poll_votes')->insert([
                'user_id' => $viewer->id,
                'poll_id' => $poll->id,
                'option_id' => $optionId,
                'created_at' => now(),
            ]);

            CommunityPollOption::query()->whereKey($optionId)->increment('votes_count');
            CommunityPoll::query()->whereKey($poll->id)->increment('total_votes');

            $post = CommunityPost::query()->find($poll->post_id);
            if ($post !== null) {
                $rootId = $post->root_id ?? $post->id;
                CommunityPost::query()->whereKey($rootId)->increment('poll_votes_count');
                $this->recalculateHotScore($rootId);
            }
        }, 3);

        $freshPoll = CommunityPoll::query()->with('options')->findOrFail($poll->id);

        return [
            'poll_id' => $freshPoll->id,
            'selected_option_id' => $optionId,
            'total_votes' => $freshPoll->total_votes,
            'options' => $freshPoll->options->map(static fn (CommunityPollOption $opt): array => [
                'id' => $opt->id,
                'label' => $opt->label,
                'votes_count' => $opt->votes_count,
                'sort_order' => $opt->sort_order,
            ])->values()->all(),
        ];
    }

    /**
     * Toggle following another user.
     *
     * @return array{following: bool}
     */
    public function toggleFollow(User $viewer, User $target): array
    {
        if ($viewer->id === $target->id) {
            throw ValidationException::withMessages([
                'user' => ['Bạn không thể tự theo dõi chính mình.'],
            ]);
        }

        return DB::transaction(function () use ($viewer, $target): array {
            $deleted = DB::table('community_follows')
                ->where('follower_id', $viewer->id)
                ->where('following_id', $target->id)
                ->delete();

            if ($deleted > 0) {
                return ['following' => false];
            }

            DB::table('community_follows')->insertOrIgnore([
                'follower_id' => $viewer->id,
                'following_id' => $target->id,
                'created_at' => now(),
            ]);

            return ['following' => true];
        }, 3);
    }

    /**
     * Soft-delete a post owned by the actor while keeping status synced for covering index scans.
     *
     * @throws AuthorizationException
     */
    public function softDeletePost(User $actor, CommunityPost $post): void
    {
        if ($post->user_id !== $actor->id) {
            throw new AuthorizationException('Bạn không có quyền xóa bài viết này.');
        }

        DB::transaction(function () use ($post): void {
            $lockedPost = CommunityPost::query()
                ->withTrashed()
                ->whereKey($post->id)
                ->lockForUpdate()
                ->first();

            if (
                $lockedPost === null
                || $lockedPost->trashed()
                || $lockedPost->status !== CommunityPostStatus::Published
            ) {
                return;
            }

            $now = now();
            $lockedPost->update(['status' => CommunityPostStatus::Deleted]);
            $lockedPost->delete();

            // If deleting a pure repost directly, decrement original post's reposts_count
            if ($lockedPost->repost_of_id !== null) {
                $this->decrementFloorZero('community_posts', $lockedPost->repost_of_id, 'reposts_count');
                $target = CommunityPost::query()->find($lockedPost->repost_of_id);
                if ($target !== null) {
                    $this->recalculateHotScore($target->root_id ?? $target->id);
                }
            }

            // Collect descendant post IDs (for root deletion or reply branch deletion) so ghost reposts and counters stay consistent
            $deletedPostIds = [$lockedPost->id];
            $descendantReplyCount = 0;
            $descendantSubstantiveCount = 0;

            $isSelfThreadContinuation = $lockedPost->thread_group_id !== null
                && $lockedPost->root_id !== null
                && $lockedPost->thread_group_id === $lockedPost->root_id
                && $lockedPost->id !== $lockedPost->root_id;

            if ($lockedPost->depth === 0 && $lockedPost->root_id === null && $lockedPost->repost_of_id === null) {
                $descendants = CommunityPost::query()
                    ->where('root_id', $lockedPost->id)
                    ->where('status', CommunityPostStatus::Published->value)
                    ->get(['id']);

                if ($descendants->isNotEmpty()) {
                    $descIds = $descendants->pluck('id')->all();
                    $deletedPostIds = array_merge($deletedPostIds, $descIds);
                    CommunityPost::query()
                        ->whereIn('id', $descIds)
                        ->update([
                            'status' => CommunityPostStatus::Deleted->value,
                            'deleted_at' => $now,
                        ]);
                }
            } elseif ($lockedPost->root_id !== null) {
                $treeNodes = CommunityPost::query()
                    ->where('root_id', $lockedPost->root_id)
                    ->where('status', CommunityPostStatus::Published->value)
                    ->get(['id', 'parent_id', 'thread_group_id', 'body']);

                $childrenByParent = [];
                foreach ($treeNodes as $node) {
                    if ($node->parent_id !== null) {
                        $childrenByParent[$node->parent_id][] = $node;
                    }
                }

                $queue = [$lockedPost->id];
                $descIds = [];
                while ($queue !== []) {
                    $currentId = array_shift($queue);
                    foreach ($childrenByParent[$currentId] ?? [] as $child) {
                        $descIds[] = $child->id;
                        $queue[] = $child->id;

                        $childIsSelfThread = $child->thread_group_id !== null
                            && $child->thread_group_id === $lockedPost->root_id;
                        if (! $childIsSelfThread) {
                            $descendantReplyCount++;
                            if (mb_strlen(trim((string) $child->body)) >= 30) {
                                $descendantSubstantiveCount++;
                            }
                        }
                    }
                }

                if ($descIds !== []) {
                    $deletedPostIds = array_merge($deletedPostIds, $descIds);
                    CommunityPost::query()
                        ->whereIn('id', $descIds)
                        ->update([
                            'status' => CommunityPostStatus::Deleted->value,
                            'deleted_at' => $now,
                        ]);
                }

                $selfReplyDecrement = $isSelfThreadContinuation ? 0 : 1;
                $selfSubstantiveDecrement = (! $isSelfThreadContinuation && mb_strlen(trim((string) $lockedPost->body)) >= 30) ? 1 : 0;
                $totalReplyDecrement = $selfReplyDecrement + $descendantReplyCount;
                $totalSubstantiveDecrement = $selfSubstantiveDecrement + $descendantSubstantiveCount;

                if (! $isSelfThreadContinuation && $lockedPost->parent_id !== null && $lockedPost->parent_id !== $lockedPost->root_id) {
                    $this->decrementFloorZero('community_posts', $lockedPost->parent_id, 'replies_count');
                }

                if ($totalReplyDecrement > 0) {
                    $this->decrementFloorZero('community_posts', $lockedPost->root_id, 'replies_count', $totalReplyDecrement);
                }

                if ($totalSubstantiveDecrement > 0) {
                    $this->decrementFloorZero(
                        'community_posts',
                        $lockedPost->root_id,
                        'substantive_replies_count',
                        $totalSubstantiveDecrement
                    );
                }

                if ($totalReplyDecrement > 0 || $totalSubstantiveDecrement > 0) {
                    $this->recalculateHotScore($lockedPost->root_id);
                }
            }

            // Cascade soft-delete all active pure reposts pointing to any deleted post
            CommunityPost::query()
                ->whereIn('repost_of_id', $deletedPostIds)
                ->where('status', CommunityPostStatus::Published->value)
                ->update([
                    'status' => CommunityPostStatus::Deleted->value,
                    'deleted_at' => $now,
                ]);

            if ($lockedPost->topic_tag_id !== null && $lockedPost->depth === 0 && $lockedPost->repost_of_id === null) {
                $this->decrementFloorZero('community_topic_tags', $lockedPost->topic_tag_id, 'posts_count');
            }
        }, 3);

        $this->trendingService->forgetCache();
    }

    /**
     * Toggle author visibility of a level-1 reply (hiding its branch from public view).
     *
     * @throws AuthorizationException
     */
    public function toggleHideReply(User $actor, CommunityPost $reply): bool
    {
        if (
            $reply->root_id === null
            || $reply->status !== CommunityPostStatus::Published
            || ($reply->thread_group_id !== null && $reply->thread_group_id === $reply->root_id)
        ) {
            throw ValidationException::withMessages([
                'post' => ['Chỉ có thể ẩn các phản hồi khả dụng trong bài viết.'],
            ]);
        }

        $rootPost = CommunityPost::query()->findOrFail($reply->root_id);

        if ($rootPost->status !== CommunityPostStatus::Published) {
            throw ValidationException::withMessages([
                'post' => ['Bài viết gốc không còn khả dụng.'],
            ]);
        }

        if ($rootPost->user_id !== $actor->id) {
            throw new AuthorizationException('Chỉ tác giả bài viết gốc mới có quyền ẩn phản hồi.');
        }

        $newHidden = ! $reply->is_hidden_by_author;
        $reply->update(['is_hidden_by_author' => $newHidden]);

        return $newHidden;
    }

    /**
     * Resolve an actionable target post (following pure repost wrappers cleanly).
     */
    private function resolvePublishableTarget(CommunityPost $post, string $errorMessage): CommunityPost
    {
        if ($post->status !== CommunityPostStatus::Published || $post->is_hidden_by_author) {
            throw ValidationException::withMessages([
                'post' => [$errorMessage],
            ]);
        }

        $targetPost = $post->repost_of_id !== null
            ? CommunityPost::query()->find($post->repost_of_id)
            : $post;

        if (
            $targetPost === null
            || $targetPost->status !== CommunityPostStatus::Published
            || $targetPost->is_hidden_by_author
        ) {
            throw ValidationException::withMessages([
                'post' => [$errorMessage],
            ]);
        }

        return $targetPost;
    }

    /**
     * Enforce Threads-style reply_control permissions against the root post.
     *
     * @throws AuthorizationException
     */
    private function assertCanReply(User $actor, CommunityPost $rootPost): void
    {
        if ($actor->id === $rootPost->user_id) {
            return;
        }

        switch ($rootPost->reply_control) {
            case ReplyControl::Everyone:
                return;

            case ReplyControl::Locked:
                throw new AuthorizationException('Tác giả đã khóa phản hồi cho bài viết này.');

            case ReplyControl::Followers:
                $isFollower = DB::table('community_follows')
                    ->where('follower_id', $actor->id)
                    ->where('following_id', $rootPost->user_id)
                    ->exists();

                if (! $isFollower) {
                    throw new AuthorizationException('Chỉ người theo dõi tác giả mới có thể trả lời.');
                }

                return;

            case ReplyControl::Following:
                $authorFollowsActor = DB::table('community_follows')
                    ->where('follower_id', $rootPost->user_id)
                    ->where('following_id', $actor->id)
                    ->exists();

                if (! $authorFollowsActor) {
                    throw new AuthorizationException('Chỉ những người được tác giả theo dõi mới có thể trả lời.');
                }

                return;

            case ReplyControl::MentionedOnly:
                $username = \App\Models\CommunityProfile::query()
                    ->where('user_id', $actor->id)
                    ->value('username') ?? CommunityTextHelper::defaultUsernameFor($actor);

                $pattern = '/(?<![\p{L}\p{N}_.])@'.preg_quote($username, '/').'(?![\p{L}\p{N}_.])/ui';
                $bodies = [(string) $rootPost->body];
                if ($rootPost->thread_group_id !== null) {
                    $continuationBodies = CommunityPost::query()
                        ->where('thread_group_id', $rootPost->thread_group_id)
                        ->where('id', '!=', $rootPost->id)
                        ->where('status', CommunityPostStatus::Published->value)
                        ->pluck('body')
                        ->all();
                    foreach ($continuationBodies as $partBody) {
                        $bodies[] = (string) $partBody;
                    }
                }

                $mentionedInThread = false;
                foreach ($bodies as $text) {
                    if (preg_match($pattern, $text) === 1) {
                        $mentionedInThread = true;
                        break;
                    }
                }

                if (! $mentionedInThread) {
                    throw new AuthorizationException('Chỉ tài khoản được nhắc tên mới có thể trả lời.');
                }

                return;
        }
    }

    /**
     * Recalculate materialized DECIMAL(12, 4) hot_score on a root post.
     */
    private function recalculateHotScore(int $rootId): void
    {
        $post = CommunityPost::query()->find($rootId);
        if ($post === null) {
            return;
        }

        $createdAtTimestamp = $post->created_at !== null ? $post->created_at->timestamp : now()->timestamp;
        $baseOffset = $post->repost_of_id !== null ? -1.0 : 0.0;
        $score = $this->computeHotScore(
            $post->substantive_replies_count,
            $post->quotes_count,
            $post->reposts_count,
            $post->poll_votes_count,
            $post->likes_count,
            $createdAtTimestamp,
            $baseOffset,
        );

        CommunityPost::query()->whereKey($rootId)->update(['hot_score' => $score]);
    }

    private function computeHotScore(
        int $substantiveReplies,
        int $quotes,
        int $reposts,
        int $pollVotes,
        int $likes,
        ?int $createdAtTimestamp = null,
        float $baseOffset = 0.0,
    ): string {
        $engagement = ($substantiveReplies * 4.0)
            + ($quotes * 4.5)
            + ($reposts * 3.5)
            + ($pollVotes * 1.5)
            + ($likes * 1.0);

        $timestamp = $createdAtTimestamp ?? now()->timestamp;
        $epochStart = 1735689600; // 2025-01-01 00:00:00 UTC
        $hoursSinceEpoch = max(0.0, ($timestamp - $epochStart) / 3600.0);

        // Monotonic epoch-based Reddit-style score: avoids passive value drift under keyset cursors
        // while letting fresh posts outrank inactive legacy posts.
        $score = max(0.0, (log10(1.0 + max(0.0, $engagement)) * 10.0) + ($hoursSinceEpoch / 12.0) + $baseOffset);

        return number_format($score, 4, '.', '');
    }

    private function decrementFloorZero(string $table, int $id, string $column, int $amount = 1): void
    {
        $amount = max(1, $amount);

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "UPDATE {$table} SET {$column} = GREATEST(0, CAST({$column} AS SIGNED) - ?) WHERE id = ?",
                [$amount, $id]
            );

            return;
        }

        DB::statement(
            "UPDATE {$table} SET {$column} = MAX(0, {$column} - ?) WHERE id = ?",
            [$amount, $id]
        );
    }
}
