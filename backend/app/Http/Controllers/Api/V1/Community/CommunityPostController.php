<?php

namespace App\Http\Controllers\Api\V1\Community;

use App\Enums\CommunityPostStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Community\StoreCommunityPostRequest;
use App\Http\Requests\Community\StoreCommunityReplyRequest;
use App\Http\Resources\Community\CommunityPostResource;
use App\Models\CommunityPost;
use App\Models\User;
use App\Services\Community\CommunityFeedService;
use App\Services\Community\CommunityHydrationService;
use App\Services\Community\CommunityWriteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityPostController extends Controller
{
    public function __construct(
        private readonly CommunityFeedService $feedService,
        private readonly CommunityWriteService $writeService,
        private readonly CommunityHydrationService $hydrationService,
    ) {}

    /**
     * Create a new community post or multi-part self-thread.
     */
    public function store(StoreCommunityPostRequest $request): JsonResponse
    {
        /** @var User $author */
        $author = $request->user();
        $post = $this->writeService->createThread($author, $request->validated());

        $selfThreads = $this->hydrationService->fetchSelfThreadItems([$post->id]);
        $allNodes = collect([$post]);
        foreach ($selfThreads as $group) {
            foreach ($group as $item) {
                $allNodes->push($item);
            }
        }
        $viewerContext = $this->hydrationService->hydrateViewerContext($allNodes, $author);

        return response()->json([
            'data' => (new CommunityPostResource($post, $viewerContext, $selfThreads))->toArray($request),
        ], 201);
    }

    /**
     * Show a thread detail with ancestors, self-thread chain, and 2-level reply tree.
     */
    public function show(Request $request, CommunityPost $post): JsonResponse
    {
        if ($post->status !== CommunityPostStatus::Published || $post->is_hidden_by_author) {
            abort(404, 'Bài viết không tồn tại hoặc đã bị xóa.');
        }

        /** @var User $viewer */
        $viewer = $request->user();
        $detail = $this->feedService->getThreadDetail($viewer, $post);
        $context = $detail['viewer_context'];

        return response()->json([
            'data' => [
                'post' => (new CommunityPostResource($detail['post'], $context))->toArray($request),
                'root_author_id' => $detail['root_author_id'],
                'ancestors' => $detail['ancestors']
                    ->map(static fn (CommunityPost $item): array => (new CommunityPostResource($item, $context))->toArray($request))
                    ->values()
                    ->all(),
                'self_thread_items' => $detail['self_thread_items']
                    ->map(static fn (CommunityPost $item): array => (new CommunityPostResource($item, $context))->toArray($request))
                    ->values()
                    ->all(),
                'replies' => $detail['replies']
                    ->map(static fn (CommunityPost $item): array => (new CommunityPostResource($item, $context))->toArray($request))
                    ->values()
                    ->all(),
            ],
        ]);
    }

    /**
     * Lazy-load direct replies for a specific post branch.
     */
    public function replies(Request $request, CommunityPost $post): JsonResponse
    {
        if ($post->status !== CommunityPostStatus::Published || $post->is_hidden_by_author) {
            abort(404, 'Bài viết không tồn tại hoặc đã bị xóa.');
        }

        /** @var User $viewer */
        $viewer = $request->user();
        $cursor = $request->string('cursor')->toString();
        $result = $this->feedService->getBranchReplies(
            $viewer,
            $post,
            $cursor !== '' ? $cursor : null,
            $request->integer('limit', 20),
        );

        return response()->json([
            'data' => $result['replies']
                ->map(static fn (CommunityPost $item): array => (new CommunityPostResource($item, $result['viewer_context']))->toArray($request))
                ->values()
                ->all(),
            'meta' => [
                'next_cursor' => $result['next_cursor'],
                'has_more' => $result['has_more'],
            ],
        ]);
    }

    /**
     * Create a reply under a post or comment node.
     */
    public function storeReply(StoreCommunityReplyRequest $request, CommunityPost $post): JsonResponse
    {
        /** @var User $author */
        $author = $request->user();
        $reply = $this->writeService->createReply($author, $post, $request->validated());
        $context = $this->hydrationService->hydrateViewerContext(collect([$reply]), $author);

        return response()->json([
            'data' => (new CommunityPostResource($reply, $context))->toArray($request),
        ], 201);
    }

    /**
     * Soft-delete a post owned by the authenticated user.
     */
    public function destroy(Request $request, CommunityPost $post): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $this->writeService->softDeletePost($actor, $post);

        return response()->json([
            'message' => 'Đã xóa bài viết.',
        ]);
    }

    /**
     * Toggle hiding a reply by the root post author.
     */
    public function hideReply(Request $request, CommunityPost $post): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $hidden = $this->writeService->toggleHideReply($actor, $post);

        return response()->json([
            'data' => [
                'id' => $post->id,
                'is_hidden_by_author' => $hidden,
            ],
        ]);
    }
}
