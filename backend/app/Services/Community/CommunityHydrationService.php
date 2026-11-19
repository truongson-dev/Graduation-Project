<?php

namespace App\Services\Community;

use App\Enums\CommunityPostStatus;
use App\Enums\CommunityReactionType;
use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CommunityHydrationService
{
    /**
     * Eager load relationships and batch-hydrate viewer interaction state without N+1 queries.
     *
     * @param  Collection<int, CommunityPost>  $posts
     * @return array<int, array<string, mixed>>
     */
    public function hydrateViewerContext(Collection $posts, User $viewer): array
    {
        if ($posts->isEmpty()) {
            return [];
        }

        EloquentCollection::make($posts->all())->loadMissing([
            'author.communityProfile',
            'topicTag',
            'poll.options',
            'repostOf.author.communityProfile',
            'repostOf.topicTag',
            'repostOf.poll.options',
            'quotePost.author.communityProfile',
            'quotePost.topicTag',
        ]);

        /** @var list<int> $postIds */
        $postIds = [];
        /** @var list<int> $pollIds */
        $pollIds = [];
        /** @var list<int> $authorIds */
        $authorIds = [];
        /** @var array<int, int> $authorByPostId */
        $authorByPostId = [];

        foreach ($posts as $post) {
            $postIds[] = $post->id;
            if ($post->user_id !== null) {
                $authorIds[] = (int) $post->user_id;
                $authorByPostId[$post->id] = (int) $post->user_id;
            }
            if ($post->poll !== null) {
                $pollIds[] = $post->poll->id;
            }
            if ($post->repostOf !== null) {
                $postIds[] = $post->repostOf->id;
                if ($post->repostOf->user_id !== null) {
                    $authorIds[] = (int) $post->repostOf->user_id;
                    $authorByPostId[$post->repostOf->id] = (int) $post->repostOf->user_id;
                }
                if ($post->repostOf->poll !== null) {
                    $pollIds[] = $post->repostOf->poll->id;
                }
                if ($post->repostOf->quotePost !== null) {
                    $postIds[] = $post->repostOf->quotePost->id;
                    if ($post->repostOf->quotePost->user_id !== null) {
                        $authorIds[] = (int) $post->repostOf->quotePost->user_id;
                        $authorByPostId[$post->repostOf->quotePost->id] = (int) $post->repostOf->quotePost->user_id;
                    }
                }
            }
            if ($post->quotePost !== null) {
                $postIds[] = $post->quotePost->id;
                if ($post->quotePost->user_id !== null) {
                    $authorIds[] = (int) $post->quotePost->user_id;
                    $authorByPostId[$post->quotePost->id] = (int) $post->quotePost->user_id;
                }
            }
        }

        $postIds = array_values(array_unique($postIds));
        $pollIds = array_values(array_unique($pollIds));
        $authorIds = array_values(array_unique($authorIds));

        $reactionsByPost = $this->fetchReactionsMap($viewer->id, $postIds);
        $repostsSet = $this->fetchRepostedSet($viewer->id, $postIds);
        $votesByPoll = $this->fetchPollVotesMap($viewer->id, $pollIds);
        $followingSet = $this->fetchFollowingSet($viewer->id, $authorIds);

        $context = [];
        foreach ($postIds as $postId) {
            $authorId = $authorByPostId[$postId] ?? null;
            $context[$postId] = [
                'liked' => $reactionsByPost[$postId][CommunityReactionType::Like->value] ?? false,
                'bookmarked' => $reactionsByPost[$postId][CommunityReactionType::Bookmark->value] ?? false,
                'reposted' => $repostsSet[$postId] ?? false,
                'following' => $authorId !== null ? ($followingSet[$authorId] ?? false) : false,
                'poll_votes' => $votesByPoll,
            ];
        }

        return $context;
    }

    /**
     * Fetch self-thread continuation items for root posts in a single batch query.
     *
     * @param  list<int>  $rootIds
     * @return Collection<int, Collection<int, CommunityPost>>
     */
    public function fetchSelfThreadItems(array $rootIds): Collection
    {
        if ($rootIds === []) {
            return collect();
        }

        $items = CommunityPost::query()
            ->with(['author.communityProfile', 'topicTag', 'poll.options', 'quotePost.author.communityProfile', 'quotePost.topicTag'])
            ->whereIn('thread_group_id', $rootIds)
            ->whereColumn('id', '!=', 'thread_group_id')
            ->where('status', CommunityPostStatus::Published->value)
            ->where('is_hidden_by_author', false)
            ->orderBy('id')
            ->get();

        /** @var Collection<int, Collection<int, CommunityPost>> $grouped */
        $grouped = collect();
        foreach ($items as $item) {
            if ($item->thread_group_id === null) {
                continue;
            }

            if (! $grouped->has($item->thread_group_id)) {
                $grouped->put($item->thread_group_id, collect());
            }

            $grouped->get($item->thread_group_id)?->push($item);
        }

        return $grouped;
    }

    /**
     * @param  list<int>  $postIds
     * @return array<int, array<string, bool>>
     */
    private function fetchReactionsMap(int $viewerId, array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $rows = DB::table('community_post_reactions')
            ->select(['post_id', 'type'])
            ->where('user_id', $viewerId)
            ->whereIn('post_id', $postIds)
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row->post_id][(string) $row->type] = true;
        }

        return $map;
    }

    /**
     * @param  list<int>  $postIds
     * @return array<int, bool>
     */
    private function fetchRepostedSet(int $viewerId, array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $repostedIds = DB::table('community_posts')
            ->where('user_id', $viewerId)
            ->whereIn('repost_of_id', $postIds)
            ->where('status', CommunityPostStatus::Published->value)
            ->whereNull('deleted_at')
            ->pluck('repost_of_id');

        $set = [];
        foreach ($repostedIds as $repostedId) {
            $set[(int) $repostedId] = true;
        }

        return $set;
    }

    /**
     * @param  list<int>  $pollIds
     * @return array<int, int>
     */
    private function fetchPollVotesMap(int $viewerId, array $pollIds): array
    {
        if ($pollIds === []) {
            return [];
        }

        $rows = DB::table('community_poll_votes')
            ->select(['poll_id', 'option_id'])
            ->where('user_id', $viewerId)
            ->whereIn('poll_id', $pollIds)
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row->poll_id] = (int) $row->option_id;
        }

        return $map;
    }

    /**
     * @param  list<int>  $authorIds
     * @return array<int, bool>
     */
    private function fetchFollowingSet(int $viewerId, array $authorIds): array
    {
        if ($authorIds === []) {
            return [];
        }

        $followingIds = DB::table('community_follows')
            ->where('follower_id', $viewerId)
            ->whereIn('following_id', $authorIds)
            ->pluck('following_id');

        $set = [];
        foreach ($followingIds as $followingId) {
            $set[(int) $followingId] = true;
        }

        return $set;
    }
}
