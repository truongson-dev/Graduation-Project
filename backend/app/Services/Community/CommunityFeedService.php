<?php

namespace App\Services\Community;

use App\Enums\CommunityPostStatus;
use App\Enums\CommunityReactionType;
use App\Models\CommunityPost;
use App\Models\CommunityTopicTag;
use App\Models\User;
use App\Support\CommunityTextHelper;
use DateTimeImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CommunityFeedService
{
    /**
     * Standard eager-load graph for feed, search, and thread cards.
     *
     * @var list<string>
     */
    private const POST_RELATIONS = [
        'author.communityProfile',
        'topicTag',
        'poll.options',
        'repostOf.author.communityProfile',
        'repostOf.topicTag',
        'repostOf.poll.options',
        'repostOf.quotePost.author.communityProfile',
        'repostOf.quotePost.topicTag',
        'quotePost.author.communityProfile',
        'quotePost.topicTag',
    ];

    public function __construct(
        private readonly CommunityHydrationService $hydrationService,
    ) {}

    /**
     * Fetch a cursor-paginated feed for "for_you", "following", "saved", or "liked" tabs.
     *
     * @param  list<int>|null  $postIds
     * @return array{
     *     posts: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>,
     *     self_threads: Collection<int, Collection<int, CommunityPost>>,
     *     next_cursor: ?string,
     *     has_more: bool
     * }
     */
    public function getFeed(
        User $viewer,
        string $tab = 'for_you',
        ?string $topicSlug = null,
        ?string $cursor = null,
        int $limit = 15,
        ?array $postIds = null,
    ): array {
        $limit = max(1, min($limit, 30));
        $decodedCursor = $this->decodeCursor($cursor);
        $topicId = null;

        if ($topicSlug !== null && $topicSlug !== '') {
            $topicId = CommunityTopicTag::query()
                ->where('slug', $topicSlug)
                ->where('is_active', true)
                ->value('id');

            if ($topicId === null) {
                return [
                    'posts' => collect(),
                    'viewer_context' => [],
                    'self_threads' => collect(),
                    'next_cursor' => null,
                    'has_more' => false,
                ];
            }
        }

        if ($postIds !== null && $postIds !== []) {
            $pinnedQuery = DB::table('community_posts as p')
                ->select('p.id')
                ->whereIn('p.id', $postIds)
                ->where('p.depth', 0)
                ->where('p.status', CommunityPostStatus::Published->value)
                ->whereNull('p.deleted_at');

            if ($topicId !== null) {
                $pinnedQuery->where('p.topic_tag_id', $topicId);
            }

            if ($tab === 'saved' || $tab === 'liked') {
                $reactionType = $tab === 'saved'
                    ? CommunityReactionType::Bookmark->value
                    : CommunityReactionType::Like->value;
                $pinnedQuery->join('community_post_reactions as r', function ($join) use ($viewer, $reactionType): void {
                    $join->on('r.post_id', '=', 'p.id')
                        ->where('r.user_id', '=', $viewer->id)
                        ->where('r.type', '=', $reactionType);
                });
            } elseif ($tab === 'following') {
                $pinnedQuery->whereIn('p.user_id', function ($sub) use ($viewer): void {
                    $sub->select('following_id')
                        ->from('community_follows')
                        ->where('follower_id', $viewer->id);
                });
            }

            $pageIds = $pinnedQuery
                ->orderByDesc('p.hot_score')
                ->orderByDesc('p.id')
                ->limit($limit)
                ->pluck('p.id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->all();

            $reactionRows = [];
            $hasMore = false;
            $slicedIds = $pageIds;
        } else {
            $reactionRows = [];
            if ($tab === 'saved' || $tab === 'liked') {
                $reactionType = $tab === 'saved'
                    ? CommunityReactionType::Bookmark
                    : CommunityReactionType::Like;
                $reactionRows = $this->fetchReactionPageRows(
                    $viewer->id,
                    $reactionType,
                    $topicId,
                    $decodedCursor,
                    $limit + 1,
                );
                $pageIds = array_column($reactionRows, 'id');
            } else {
                $pageIds = $tab === 'following'
                    ? $this->fetchFollowingPageIds($viewer->id, $topicId, $decodedCursor, $limit + 1)
                    : $this->fetchForYouPageIds($topicId, $decodedCursor, $limit + 1);
            }

            $hasMore = count($pageIds) > $limit;
            $slicedIds = array_slice($pageIds, 0, $limit);
        }

        if ($slicedIds === []) {
            return [
                'posts' => collect(),
                'viewer_context' => [],
                'self_threads' => collect(),
                'next_cursor' => null,
                'has_more' => false,
            ];
        }

        $postsById = CommunityPost::query()
            ->with(self::POST_RELATIONS)
            ->whereIn('id', $slicedIds)
            ->get()
            ->keyBy('id');

        /** @var Collection<int, CommunityPost> $orderedPosts */
        $orderedPosts = collect();
        foreach ($slicedIds as $id) {
            $post = $postsById->get($id);
            if ($post !== null) {
                $orderedPosts->push($post);
            }
        }

        $repostTargetIds = $orderedPosts
            ->pluck('repost_of_id')
            ->filter(static fn (mixed $id): bool => $id !== null)
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
        $selfThreadTargetIds = array_values(array_unique(array_merge($slicedIds, $repostTargetIds)));

        $selfThreads = $this->hydrationService->fetchSelfThreadItems($selfThreadTargetIds);

        $allPostsToHydrate = collect($orderedPosts->all());
        foreach ($selfThreads as $group) {
            foreach ($group as $item) {
                $allPostsToHydrate->push($item);
            }
        }
        $viewerContext = $this->hydrationService->hydrateViewerContext($allPostsToHydrate, $viewer);

        $lastPost = $orderedPosts->last();
        $nextCursor = null;
        if ($hasMore && $lastPost !== null) {
            if ($tab === 'saved' || $tab === 'liked') {
                $slicedReactionRows = array_slice($reactionRows, 0, $limit);
                $lastReactionRow = end($slicedReactionRows);
                if (is_array($lastReactionRow)) {
                    $nextCursor = $this->encodeCursor([
                        'reacted_at' => $lastReactionRow['reacted_at'],
                        'id' => $lastReactionRow['id'],
                    ]);
                }
            } elseif ($tab === 'following') {
                $nextCursor = $this->encodeCursor([
                    'created_at' => $lastPost->created_at?->format('Y-m-d H:i:s'),
                    'id' => $lastPost->id,
                ]);
            } else {
                $nextCursor = $this->encodeCursor([
                    'score' => (string) $lastPost->hot_score,
                    'id' => $lastPost->id,
                ]);
            }
        }

        return [
            'posts' => $orderedPosts,
            'viewer_context' => $viewerContext,
            'self_threads' => $selfThreads,
            'next_cursor' => $nextCursor,
            'has_more' => $hasMore,
        ];
    }

    /**
     * Fetch thread detail: ancestors (WITH RECURSIVE), self-thread chain, and 2-level reply preview tree.
     *
     * @return array{
     *     post: CommunityPost,
     *     root_author_id: ?int,
     *     ancestors: Collection<int, CommunityPost>,
     *     self_thread_items: Collection<int, CommunityPost>,
     *     replies: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>
     * }
     */
    public function getThreadDetail(User $viewer, CommunityPost $post): array
    {
        $post->loadMissing(self::POST_RELATIONS);

        $rootAuthorId = $this->resolveRootAuthorId($post);
        $canSeeHidden = $rootAuthorId !== null && $viewer->id === $rootAuthorId;

        $ancestors = $this->fetchAncestors($post);
        $selfThreadItems = $this->fetchSelfThreadChain($post);
        $replies = $this->fetchVisibleReplyTree($post->id, $canSeeHidden);

        $allNodes = collect([$post])
            ->concat($ancestors)
            ->concat($selfThreadItems)
            ->concat($replies);

        $viewerContext = $this->hydrationService->hydrateViewerContext($allNodes, $viewer);

        return [
            'post' => $post,
            'root_author_id' => $rootAuthorId,
            'ancestors' => $ancestors,
            'self_thread_items' => $selfThreadItems,
            'replies' => $replies,
            'viewer_context' => $viewerContext,
        ];
    }

    /**
     * Lazy-load direct replies for a specific branch node.
     *
     * @return array{
     *     replies: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>,
     *     has_more: bool,
     *     next_cursor: ?string
     * }
     */
    public function getBranchReplies(User $viewer, CommunityPost $parent, ?string $cursor = null, int $limit = 20): array
    {
        $limit = max(1, min($limit, 50));
        $decoded = $this->decodeCursor($cursor);
        $rootAuthorId = $this->resolveRootAuthorId($parent);
        $canSeeHidden = $rootAuthorId !== null && $viewer->id === $rootAuthorId;

        $query = CommunityPost::query()
            ->with(self::POST_RELATIONS)
            ->where('parent_id', $parent->id)
            ->where('status', CommunityPostStatus::Published->value);

        if (! $canSeeHidden) {
            $query->where('is_hidden_by_author', false);
        }

        if ($parent->thread_group_id !== null) {
            $query->where(function ($q) use ($parent): void {
                $q->whereNull('thread_group_id')
                    ->orWhere('thread_group_id', '!=', $parent->thread_group_id);
            });
        }

        if ($decoded !== null && isset($decoded['likes'], $decoded['id'])) {
            $cursorLikes = (int) $decoded['likes'];
            $cursorId = (int) $decoded['id'];
            $query->where(function ($q) use ($cursorLikes, $cursorId): void {
                $q->where('likes_count', '<', $cursorLikes)
                    ->orWhere(function ($sub) use ($cursorLikes, $cursorId): void {
                        $sub->where('likes_count', '=', $cursorLikes)
                            ->where('id', '>', $cursorId);
                    });
            });
        }

        $items = $query
            ->orderByDesc('likes_count')
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $items->count() > $limit;
        $sliced = $items->take($limit)->values();
        $viewerContext = $this->hydrationService->hydrateViewerContext($sliced, $viewer);

        $last = $sliced->last();
        $nextCursor = ($hasMore && $last !== null)
            ? $this->encodeCursor(['likes' => $last->likes_count, 'id' => $last->id])
            : null;

        return [
            'replies' => $sliced,
            'viewer_context' => $viewerContext,
            'has_more' => $hasMore,
            'next_cursor' => $nextCursor,
        ];
    }

    /**
     * Search published root posts using MySQL InnoDB FULLTEXT boolean search (with SQLite test fallback).
     *
     * @return array{
     *     posts: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>
     * }
     */
    /**
     * Search published root posts using MySQL InnoDB full-text search, with optional post_ids pinning.
     *
     * @param  list<int>|null  $postIds
     * @return array{
     *     posts: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>,
     *     self_threads: Collection<int, Collection<int, CommunityPost>>
     * }
     */
    public function searchPosts(
        User $viewer,
        string $query,
        int $limit = 20,
        string $filter = 'top',
        ?array $postIds = null,
    ): array {
        $limit = max(1, min($limit, 30));

        // When exact post_ids are provided (e.g. from a trending cluster), retrieve those posts directly
        if ($postIds !== null && $postIds !== []) {
            $builder = CommunityPost::query()
                ->with(self::POST_RELATIONS)
                ->whereIn('id', $postIds)
                ->where('depth', 0)
                ->where('status', CommunityPostStatus::Published->value);

            if ($filter === 'latest') {
                $builder->orderByDesc('created_at')->orderByDesc('id');
            } else {
                $builder->orderByDesc('hot_score')->orderByDesc('id');
            }

            $posts = $builder->limit($limit)->get();

            return $this->hydrateSearchCollection($viewer, $posts);
        }

        $normalizedQuery = CommunityTextHelper::normalizeForSearch($query);
        $booleanQuery = CommunityTextHelper::sanitizeBooleanSearchTokens($query);

        if ($normalizedQuery === '') {
            return [
                'posts' => collect(),
                'viewer_context' => [],
                'self_threads' => collect(),
            ];
        }

        $posts = collect();

        if ($booleanQuery !== '') {
            $builder = CommunityPost::query()
                ->with(self::POST_RELATIONS)
                ->where('depth', 0)
                ->where('status', CommunityPostStatus::Published->value);

            if (DB::getDriverName() === 'mysql') {
                $builder->whereFullText('body_search', $booleanQuery, ['mode' => 'boolean']);
            } else {
                $words = array_values(array_filter(explode(' ', $normalizedQuery)));
                foreach (array_slice($words, 0, 5) as $word) {
                    $builder->whereRaw("body_search LIKE ? ESCAPE '!'", ['%'.CommunityTextHelper::escapeLike($word).'%']);
                }
            }

            if ($filter === 'latest') {
                $builder->orderByDesc('created_at')->orderByDesc('id');
            } else {
                $builder->orderByDesc('hot_score')->orderByDesc('id');
            }

            $posts = $builder->limit($limit)->get();
        }

        // If boolean search returned no posts (or query only contained short/stopword tokens), fallback with escaped LIKE
        if ($posts->isEmpty()) {
            $fallbackWords = array_values(array_filter(
                explode(' ', $normalizedQuery),
                static fn (string $w): bool => mb_strlen($w) >= 2,
            ));

            if ($fallbackWords !== []) {
                $fallbackBuilder = CommunityPost::query()
                    ->with(self::POST_RELATIONS)
                    ->where('depth', 0)
                    ->where('status', CommunityPostStatus::Published->value)
                    ->where(function ($sub) use ($fallbackWords): void {
                        foreach (array_slice($fallbackWords, 0, 3) as $w) {
                            $sub->orWhereRaw("body_search LIKE ? ESCAPE '!'", ['%'.CommunityTextHelper::escapeLike($w).'%']);
                        }
                    });

                if ($filter === 'latest') {
                    $fallbackBuilder->orderByDesc('created_at')->orderByDesc('id');
                } else {
                    $fallbackBuilder->orderByDesc('hot_score')->orderByDesc('id');
                }

                $posts = $fallbackBuilder->limit($limit)->get();
            }
        }

        return $this->hydrateSearchCollection($viewer, $posts);
    }

    /**
     * @param  Collection<int, CommunityPost>  $posts
     * @return array{
     *     posts: Collection<int, CommunityPost>,
     *     viewer_context: array<int, array<string, mixed>>,
     *     self_threads: Collection<int, Collection<int, CommunityPost>>
     * }
     */
    private function hydrateSearchCollection(User $viewer, Collection $posts): array
    {
        if ($posts->isEmpty()) {
            return [
                'posts' => $posts,
                'viewer_context' => [],
                'self_threads' => collect(),
            ];
        }

        $postIds = $posts->pluck('id')->map(static fn (mixed $id): int => (int) $id)->values()->all();
        $selfThreads = $this->hydrationService->fetchSelfThreadItems($postIds);

        $allPostsToHydrate = collect($posts->all());
        foreach ($selfThreads as $group) {
            foreach ($group as $item) {
                $allPostsToHydrate->push($item);
            }
        }

        $viewerContext = $this->hydrationService->hydrateViewerContext($allPostsToHydrate, $viewer);

        return [
            'posts' => $posts,
            'viewer_context' => $viewerContext,
            'self_threads' => $selfThreads,
        ];
    }

    /**
     * Search profiles/authors relevant to the given query keyword.
     *
     * @return list<array{
     *     id: int,
     *     name: string,
     *     username: string,
     *     headline: string,
     *     avatar_url: ?string,
     *     following: bool
     * }>
     */
    public function searchPeople(User $viewer, string $query, int $limit = 20): array
    {
        $limit = max(1, min($limit, 30));
        $trimmed = trim($query);
        $normalizedBody = CommunityTextHelper::normalizeForSearch($trimmed);
        $escapedTrimmed = CommunityTextHelper::escapeLike($trimmed);

        if ($trimmed === '' || $normalizedBody === '') {
            return [];
        }

        // 1. Direct user name/username/headline match (escaped for LIKE wildcards)
        $matchedUsers = User::query()
            ->with('communityProfile')
            ->where(function ($q) use ($escapedTrimmed): void {
                $pattern = '%'.$escapedTrimmed.'%';
                $q->whereRaw("name LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereHas('communityProfile', function ($profileQ) use ($pattern): void {
                        $profileQ->whereRaw("username LIKE ? ESCAPE '!'", [$pattern])
                            ->orWhereRaw("headline LIKE ? ESCAPE '!'", [$pattern]);
                    });
            })
            ->limit($limit)
            ->get();

        // 2. Also include authors of posts discussing this topic using normalized ASCII body_search
        $remaining = $limit - $matchedUsers->count();
        if ($remaining > 0) {
            $bodyPattern = '%'.CommunityTextHelper::escapeLike($normalizedBody).'%';
            $postAuthors = CommunityPost::query()
                ->where('depth', 0)
                ->where('status', CommunityPostStatus::Published->value)
                ->whereRaw("body_search LIKE ? ESCAPE '!'", [$bodyPattern])
                ->whereNotIn('user_id', $matchedUsers->pluck('id')->all())
                ->select('user_id')
                ->distinct()
                ->limit($remaining)
                ->pluck('user_id')
                ->all();

            if ($postAuthors !== []) {
                $additionalUsers = User::query()
                    ->with('communityProfile')
                    ->whereIn('id', $postAuthors)
                    ->get();
                $matchedUsers = $matchedUsers->concat($additionalUsers);
            }
        }

        if ($matchedUsers->isEmpty()) {
            return [];
        }

        $userIds = $matchedUsers->pluck('id')->map(static fn (mixed $id): int => (int) $id)->all();
        $followingSet = DB::table('community_follows')
            ->where('follower_id', $viewer->id)
            ->whereIn('following_id', $userIds)
            ->pluck('following_id')
            ->mapWithKeys(static fn (mixed $id): array => [(int) $id => true])
            ->all();

        return $matchedUsers->map(static function (User $user) use ($followingSet): array {
            $profile = $user->communityProfile;

            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $profile !== null ? $profile->username : CommunityTextHelper::defaultUsernameFor($user),
                'headline' => $profile !== null ? $profile->headline : 'Học viên SoftSkill AI',
                'avatar_url' => $user->avatar_url,
                'following' => isset($followingSet[$user->id]),
            ];
        })->values()->all();
    }

    /**
     * Fetch IDs for "For You" feed using keyset pagination on the covering composite index.
     *
     * @param  array<string, mixed>|null  $cursor
     * @return list<int>
     */
    private function fetchForYouPageIds(?int $topicId, ?array $cursor, int $fetchLimit): array
    {
        $query = DB::table('community_posts')
            ->select('id')
            ->where('depth', 0)
            ->where('status', CommunityPostStatus::Published->value)
            ->whereNull('deleted_at');

        if ($topicId !== null) {
            $query->where('topic_tag_id', $topicId);
        }

        if ($cursor !== null && isset($cursor['score'], $cursor['id'])) {
            $cursorScore = (string) $cursor['score'];
            $cursorId = (int) $cursor['id'];

            $query->where('hot_score', '<=', $cursorScore)
                ->where(function ($sub) use ($cursorScore, $cursorId): void {
                    $sub->where('hot_score', '<', $cursorScore)
                        ->orWhere('id', '<', $cursorId);
                });
        }

        return $query
            ->orderByDesc('hot_score')
            ->orderByDesc('id')
            ->limit($fetchLimit)
            ->pluck('id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
    }

    /**
     * Fetch IDs and reaction timestamps for "Saved" (bookmark) or "Liked" (like) feeds.
     *
     * @param  array<string, mixed>|null  $cursor
     * @return list<array{id: int, reacted_at: string}>
     */
    private function fetchReactionPageRows(
        int $viewerId,
        CommunityReactionType $reactionType,
        ?int $topicId,
        ?array $cursor,
        int $fetchLimit,
    ): array {
        $query = DB::table('community_post_reactions as r')
            ->join('community_posts as p', 'p.id', '=', 'r.post_id')
            ->select(['p.id', 'r.created_at as reacted_at'])
            ->where('r.user_id', $viewerId)
            ->where('r.type', $reactionType->value)
            ->where('p.status', CommunityPostStatus::Published->value)
            ->where('p.is_hidden_by_author', false)
            ->whereNull('p.deleted_at');

        if ($topicId !== null) {
            $query->where('p.topic_tag_id', $topicId);
        }

        if ($cursor !== null && isset($cursor['reacted_at'], $cursor['id'])) {
            $cursorTs = (string) $cursor['reacted_at'];
            $cursorId = (int) $cursor['id'];

            $query->where(function ($sub) use ($cursorTs, $cursorId): void {
                $sub->where('r.created_at', '<', $cursorTs)
                    ->orWhere(function ($tie) use ($cursorTs, $cursorId): void {
                        $tie->where('r.created_at', '=', $cursorTs)
                            ->where('p.id', '<', $cursorId);
                    });
            });
        }

        return $query
            ->orderByDesc('r.created_at')
            ->orderByDesc('r.post_id')
            ->limit($fetchLimit)
            ->get()
            ->map(static fn (object $row): array => [
                'id' => (int) $row->id,
                'reacted_at' => (string) $row->reacted_at,
            ])
            ->all();
    }

    /**
     * Fetch IDs for "Following" feed (followed authors only) using CROSS JOIN LATERAL on MySQL 8.0+.
     *
     * @param  array<string, mixed>|null  $cursor
     * @return list<int>
     */
    private function fetchFollowingPageIds(int $viewerId, ?int $topicId, ?array $cursor, int $fetchLimit): array
    {
        $hasCursor = $cursor !== null && isset($cursor['created_at'], $cursor['id']);
        $cursorTs = $hasCursor ? (string) $cursor['created_at'] : null;
        $cursorId = $hasCursor ? (int) $cursor['id'] : null;

        if (DB::getDriverName() === 'mysql') {
            $topicFilterLat = $topicId !== null ? ' AND p2.topic_tag_id = ?' : '';
            $cursorFilterLat = $hasCursor ? ' AND (p2.created_at < ? OR (p2.created_at = ? AND p2.id < ?))' : '';

            $sql = <<<SQL
                SELECT lat.id
                FROM (
                    SELECT following_id
                    FROM community_follows
                    WHERE follower_id = ?
                    ORDER BY created_at DESC
                    LIMIT 500
                ) AS f
                CROSS JOIN LATERAL (
                    SELECT p2.id, p2.created_at
                    FROM community_posts p2
                    WHERE p2.user_id = f.following_id
                      AND p2.depth = 0
                      AND p2.status = ?
                      AND p2.deleted_at IS NULL
                      {$topicFilterLat}
                      {$cursorFilterLat}
                    ORDER BY p2.created_at DESC, p2.id DESC
                    LIMIT ?
                ) AS lat
                ORDER BY lat.created_at DESC, lat.id DESC
                LIMIT ?
            SQL;

            $bindings = [$viewerId, CommunityPostStatus::Published->value];
            if ($topicId !== null) {
                $bindings[] = $topicId;
            }
            if ($hasCursor) {
                $bindings[] = $cursorTs;
                $bindings[] = $cursorTs;
                $bindings[] = $cursorId;
            }
            $bindings[] = $fetchLimit;
            $bindings[] = $fetchLimit;

            $rows = DB::select($sql, $bindings);

            return array_map(static fn (object $row): int => (int) $row->id, $rows);
        }

        // Cross-driver fallback for SQLite :memory: tests
        $followingIds = DB::table('community_follows')
            ->where('follower_id', $viewerId)
            ->orderByDesc('created_at')
            ->limit(500)
            ->pluck('following_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();

        if ($followingIds === []) {
            return [];
        }

        $query = DB::table('community_posts')
            ->select('id')
            ->whereIn('user_id', $followingIds)
            ->where('depth', 0)
            ->where('status', CommunityPostStatus::Published->value)
            ->whereNull('deleted_at');

        if ($topicId !== null) {
            $query->where('topic_tag_id', $topicId);
        }

        if ($hasCursor) {
            $query->where(function ($sub) use ($cursorTs, $cursorId): void {
                $sub->where('created_at', '<', $cursorTs)
                    ->orWhere(function ($tie) use ($cursorTs, $cursorId): void {
                        $tie->where('created_at', '=', $cursorTs)
                            ->where('id', '<', $cursorId);
                    });
            });
        }

        return $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($fetchLimit)
            ->pluck('id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();
    }

    /**
     * Fetch ancestors up to the root using WITH RECURSIVE.
     *
     * @return Collection<int, CommunityPost>
     */
    private function fetchAncestors(CommunityPost $post): Collection
    {
        if ($post->parent_id === null) {
            return collect();
        }

        $sql = <<<'SQL'
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id, depth, 1 AS hop
                FROM community_posts
                WHERE id = ?
                  AND status = ?
                  AND deleted_at IS NULL
                  AND is_hidden_by_author = 0
                UNION ALL
                SELECT p.id, p.parent_id, p.depth, a.hop + 1
                FROM community_posts p
                INNER JOIN ancestors a ON p.id = a.parent_id
                WHERE p.status = ?
                  AND p.deleted_at IS NULL
                  AND p.is_hidden_by_author = 0
                  AND a.hop < 64
            )
            SELECT id FROM ancestors WHERE id != ? ORDER BY depth ASC
        SQL;

        $published = CommunityPostStatus::Published->value;
        $rows = DB::select($sql, [$post->parent_id, $published, $published, $post->id]);
        $ancestorIds = array_map(static fn (object $row): int => (int) $row->id, $rows);

        if ($ancestorIds === []) {
            return collect();
        }

        $byId = CommunityPost::query()
            ->with(self::POST_RELATIONS)
            ->whereIn('id', $ancestorIds)
            ->get()
            ->keyBy('id');

        /** @var Collection<int, CommunityPost> $ordered */
        $ordered = collect();
        foreach ($ancestorIds as $id) {
            $item = $byId->get($id);
            if ($item !== null) {
                $ordered->push($item);
            }
        }

        return $ordered;
    }

    /**
     * Resolve the owner ID of the conversation's root post regardless of intermediate ancestor visibility.
     */
    private function resolveRootAuthorId(CommunityPost $post): ?int
    {
        if ($post->root_id === null) {
            return $post->user_id !== null ? (int) $post->user_id : null;
        }

        $ownerId = CommunityPost::withTrashed()
            ->whereKey($post->root_id)
            ->value('user_id');

        return $ownerId !== null ? (int) $ownerId : ($post->user_id !== null ? (int) $post->user_id : null);
    }

    /**
     * Fetch continuation items following this post within its self-thread group.
     *
     * @return Collection<int, CommunityPost>
     */
    private function fetchSelfThreadChain(CommunityPost $post): Collection
    {
        if ($post->thread_group_id === null) {
            return collect();
        }

        return CommunityPost::query()
            ->with(self::POST_RELATIONS)
            ->where('thread_group_id', $post->thread_group_id)
            ->where('depth', '>', $post->depth)
            ->where('status', CommunityPostStatus::Published->value)
            ->where('is_hidden_by_author', false)
            ->orderBy('depth')
            ->orderBy('id')
            ->get();
    }

    /**
     * Fetch 2 levels of visible replies beneath a focal post using ROW_NUMBER() window function.
     *
     * @return Collection<int, CommunityPost>
     */
    private function fetchVisibleReplyTree(int $focalPostId, bool $includeHidden = false): Collection
    {
        $focal = CommunityPost::query()->find($focalPostId);
        if ($focal === null) {
            return collect();
        }

        $targetDepth1 = $focal->depth + 1;
        $targetDepth2 = $focal->depth + 2;
        $rootId = $focal->root_id ?? $focal->id;
        $hiddenFilter = $includeHidden ? '' : 'AND p.is_hidden_by_author = 0';
        $parentHiddenFilter = $includeHidden ? '' : 'AND parent_lvl1.is_hidden_by_author = 0';

        $sql = <<<SQL
            WITH visible_replies AS (
                SELECT p.id,
                       p.parent_id,
                       p.depth,
                       p.likes_count,
                       ROW_NUMBER() OVER (
                           PARTITION BY p.parent_id
                           ORDER BY p.likes_count DESC, p.id ASC
                       ) AS branch_rank
                FROM community_posts p
                WHERE p.root_id = ?
                  AND p.status = ?
                  AND p.deleted_at IS NULL
                  {$hiddenFilter}
                  AND (
                      (p.depth = ? AND p.parent_id = ?)
                      OR (
                          p.depth = ?
                          AND EXISTS (
                              SELECT 1
                              FROM community_posts parent_lvl1
                              WHERE parent_lvl1.id = p.parent_id
                                AND parent_lvl1.parent_id = ?
                                {$parentHiddenFilter}
                                AND parent_lvl1.status = ?
                                AND parent_lvl1.deleted_at IS NULL
                          )
                      )
                  )
            )
            SELECT id
            FROM visible_replies
            WHERE depth = ? OR branch_rank <= 2
            ORDER BY depth ASC, likes_count DESC, id ASC
            LIMIT 120
        SQL;

        $rows = DB::select($sql, [
            $rootId,
            CommunityPostStatus::Published->value,
            $targetDepth1,
            $focal->id,
            $targetDepth2,
            $focal->id,
            CommunityPostStatus::Published->value,
            $targetDepth1,
        ]);

        $ids = array_map(static fn (object $row): int => (int) $row->id, $rows);

        if ($ids === []) {
            return collect();
        }

        $byId = CommunityPost::query()
            ->with(self::POST_RELATIONS)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        /** @var Collection<int, CommunityPost> $ordered */
        $ordered = collect();
        foreach ($ids as $id) {
            $item = $byId->get($id);
            $isSelfThreadSibling = $focal->thread_group_id !== null
                && $item !== null
                && $item->thread_group_id === $focal->thread_group_id;
            if ($item !== null && ! $isSelfThreadSibling) {
                $ordered->push($item);
            }
        }

        return $ordered;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function encodeCursor(array $payload): string
    {
        $json = (string) json_encode($payload);
        $encoded = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $json, (string) config('app.key'));

        return $encoded.'.'.$signature;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeCursor(?string $cursor): ?array
    {
        if ($cursor === null || $cursor === '' || ! str_contains($cursor, '.')) {
            return null;
        }

        [$encoded, $signature] = explode('.', $cursor, 2);
        if ($encoded === '' || $signature === '') {
            return null;
        }

        $padded = str_pad(strtr($encoded, '-_', '+/'), strlen($encoded) % 4 === 0 ? strlen($encoded) : strlen($encoded) + 4 - (strlen($encoded) % 4), '=');
        $decoded = base64_decode($padded, true);

        if ($decoded === false) {
            return null;
        }

        $expectedSignature = hash_hmac('sha256', $decoded, (string) config('app.key'));
        if (! hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $data = json_decode($decoded, true);
        if (! is_array($data) || ! isset($data['id']) || ! is_int($data['id']) || $data['id'] <= 0) {
            return null;
        }

        if (isset($data['score']) && ! preg_match('/^\d+(\.\d{1,4})?$/', (string) $data['score'])) {
            return null;
        }

        if (isset($data['likes']) && (! is_int($data['likes']) || $data['likes'] < 0)) {
            return null;
        }

        foreach (['created_at', 'reacted_at'] as $tsKey) {
            if (isset($data[$tsKey])) {
                $ts = (string) $data[$tsKey];
                $parsed = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $ts);
                if ($parsed === false || $parsed->format('Y-m-d H:i:s') !== $ts) {
                    return null;
                }
            }
        }

        return $data;
    }
}
