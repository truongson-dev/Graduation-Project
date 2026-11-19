<?php

namespace App\Services\Community;

use App\Enums\CommunityPostStatus;
use App\Models\CommunityPost;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CommunityTrendingService
{
    public const CACHE_KEY = 'community:trending:v1';

    private const CACHE_TTL_SECONDS = 300;

    /**
     * Return trending discussion topics aggregated from published posts and ranked by hot_score.
     *
     * @return array{
     *     items: list<array{id: string, title: string, summary: string, posts_count: int, topic_slug: ?string, post_ids: list<int>}>,
     *     generated_at: string
     * }
     */
    public function getTrending(int $limit = 6): array
    {
        $limit = max(1, min($limit, 10));

        /** @var array{items: list<array{id: string, title: string, summary: string, posts_count: int, topic_slug: ?string, post_ids: list<int>}>, generated_at: string} $payload */
        $payload = Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL_SECONDS,
            fn (): array => $this->buildPayload(),
        );

        return [
            'items' => array_slice($payload['items'], 0, $limit),
            'generated_at' => $payload['generated_at'],
        ];
    }

    /**
     * Invalidate the cached trending snapshot after post creation or deletion.
     */
    public function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array{
     *     items: list<array{id: string, title: string, summary: string, posts_count: int, topic_slug: ?string, post_ids: list<int>}>,
     *     generated_at: string
     * }
     */
    private function buildPayload(): array
    {
        $posts = $this->fetchCandidatePosts();

        return [
            'items' => $posts->isEmpty() ? [] : $this->buildTopicItems($posts),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Fetch recent high-engagement root posts (7-day window first, falling back to all-time).
     *
     * @return Collection<int, CommunityPost>
     */
    private function fetchCandidatePosts(): Collection
    {
        $recent = CommunityPost::query()
            ->with('topicTag')
            ->where('depth', 0)
            ->where('status', CommunityPostStatus::Published->value)
            ->whereNull('repost_of_id')
            ->whereNotNull('body')
            ->where('created_at', '>=', now()->subDays(7))
            ->orderByDesc('hot_score')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        if ($recent->count() >= 3) {
            return $recent;
        }

        return CommunityPost::query()
            ->with('topicTag')
            ->where('depth', 0)
            ->where('status', CommunityPostStatus::Published->value)
            ->whereNull('repost_of_id')
            ->whereNotNull('body')
            ->orderByDesc('hot_score')
            ->orderByDesc('id')
            ->limit(30)
            ->get();
    }

    /**
     * Group candidate posts by topic tag and rank clusters by cumulative hot_score.
     *
     * @param  Collection<int, CommunityPost>  $posts
     * @return list<array{id: string, title: string, summary: string, posts_count: int, topic_slug: ?string, post_ids: list<int>}>
     */
    private function buildTopicItems(Collection $posts): array
    {
        $grouped = $posts->groupBy(
            static fn (CommunityPost $post): string => $post->topicTag !== null ? $post->topicTag->slug : '_general',
        );
        $ranked = [];

        foreach ($grouped as $slug => $groupPosts) {
            /** @var CommunityPost $topPost */
            $topPost = $groupPosts->first();
            $tagName = $topPost->topicTag?->name;
            $postIds = $groupPosts->pluck('id')->map(static fn (mixed $id): int => (int) $id)->values()->all();
            $totalPostsCount = count($postIds);
            $excerpt = Str::limit(preg_replace('/\s+/', ' ', trim((string) $topPost->body)) ?? '', 140);
            $score = $groupPosts->sum(static fn (CommunityPost $post): float => (float) $post->hot_score);

            $ranked[] = [
                'score' => $score,
                'item' => [
                    'id' => 'trend-'.($slug === '_general' ? 'general' : $slug),
                    'title' => $tagName ? "Thảo luận về {$tagName}" : 'Chủ đề nổi bật trong cộng đồng',
                    'summary' => $excerpt !== '' ? $excerpt : 'Các tình huống thực tế đang được học viên trao đổi sôi nổi.',
                    'posts_count' => $totalPostsCount,
                    'topic_slug' => $slug === '_general' ? null : (string) $slug,
                    'post_ids' => $postIds,
                ],
            ];
        }

        usort(
            $ranked,
            static fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: ($b['item']['posts_count'] <=> $a['item']['posts_count'])
        );

        return array_slice(array_column($ranked, 'item'), 0, 6);
    }
}
