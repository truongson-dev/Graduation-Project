<?php

namespace App\Http\Controllers\Api\V1\Community;

use App\Http\Controllers\Controller;
use App\Http\Requests\Community\CommunityFeedRequest;
use App\Http\Requests\Community\CommunitySearchRequest;
use App\Http\Resources\Community\CommunityPostResource;
use App\Http\Resources\Community\CommunityTopicTagResource;
use App\Models\CommunityPost;
use App\Models\CommunityTopicTag;
use App\Models\User;
use App\Services\Community\CommunityFeedService;
use App\Services\Community\CommunityTrendingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityFeedController extends Controller
{
    public function __construct(
        private readonly CommunityFeedService $feedService,
        private readonly CommunityTrendingService $trendingService,
    ) {}

    /**
     * Fetch the paginated community feed ("for_you", "following", "saved", or "liked") with optional topic or post_ids filter.
     */
    public function index(CommunityFeedRequest $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $tabInput = $request->string('tab')->toString();
        $tab = $tabInput !== '' ? $tabInput : 'for_you';
        $topic = $request->string('topic')->toString();
        $cursor = $request->string('cursor')->toString();
        $limit = $request->integer('limit', 15);
        $rawPostIds = $request->string('post_ids')->toString();
        $postIds = $this->parsePostIds($rawPostIds);

        $result = $this->feedService->getFeed(
            viewer: $viewer,
            tab: $tab,
            topicSlug: $topic !== '' ? $topic : null,
            cursor: $cursor !== '' ? $cursor : null,
            limit: $limit,
            postIds: $postIds,
        );

        $items = $result['posts']
            ->map(static fn (CommunityPost $post): array => (new CommunityPostResource(
                $post,
                $result['viewer_context'],
                $result['self_threads'],
            ))->toArray($request))
            ->values()
            ->all();

        return response()->json([
            'data' => $items,
            'meta' => [
                'next_cursor' => $result['next_cursor'],
                'has_more' => $result['has_more'],
            ],
        ]);
    }

    /**
     * List active soft-skill topic tags ordered by popularity.
     */
    public function topics(Request $request): JsonResponse
    {
        $tags = CommunityTopicTag::query()
            ->where('is_active', true)
            ->orderByDesc('posts_count')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $tags
                ->map(static fn (CommunityTopicTag $tag): array => (new CommunityTopicTagResource($tag))->toArray($request))
                ->values()
                ->all(),
        ]);
    }

    /**
     * Fetch trending discussion topics aggregated from published posts.
     */
    public function trending(Request $request): JsonResponse
    {
        $result = $this->trendingService->getTrending($request->integer('limit', 6));

        return response()->json([
            'data' => $result['items'],
            'meta' => [
                'generated_at' => $result['generated_at'],
            ],
        ]);
    }

    /**
     * Search published root posts or people using MySQL InnoDB full-text search.
     */
    public function search(CommunitySearchRequest $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $q = trim($request->string('q')->toString());
        $filter = $request->string('filter', 'top')->toString();
        $rawPostIds = $request->string('post_ids')->toString();
        $postIds = $this->parsePostIds($rawPostIds);

        if ($q === '' && ($postIds === null || $postIds === [])) {
            return response()->json(['data' => []]);
        }

        if ($filter === 'people') {
            $people = $this->feedService->searchPeople($viewer, $q, $request->integer('limit', 20));

            return response()->json(['data' => $people]);
        }

        $result = $this->feedService->searchPosts(
            $viewer,
            $q,
            $request->integer('limit', 20),
            in_array($filter, ['top', 'latest'], true) ? $filter : 'top',
            $postIds,
        );

        return response()->json([
            'data' => $result['posts']
                ->map(static fn (CommunityPost $post): array => (new CommunityPostResource(
                    $post,
                    $result['viewer_context'],
                    $result['self_threads'],
                ))->toArray($request))
                ->values()
                ->all(),
        ]);
    }

    /**
     * @return list<int>|null
     */
    private function parsePostIds(string $rawPostIds): ?array
    {
        if ($rawPostIds === '') {
            return null;
        }

        return array_values(array_slice(array_unique(array_filter(
            array_map('intval', explode(',', $rawPostIds)),
            static fn (int $id): bool => $id > 0,
        )), 0, 50));
    }
}
