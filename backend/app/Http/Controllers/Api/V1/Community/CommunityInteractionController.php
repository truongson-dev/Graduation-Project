<?php

namespace App\Http\Controllers\Api\V1\Community;

use App\Enums\CommunityReactionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Community\ToggleReactionRequest;
use App\Http\Requests\Community\VotePollRequest;
use App\Models\CommunityPoll;
use App\Models\CommunityPost;
use App\Models\User;
use App\Services\Community\CommunityWriteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityInteractionController extends Controller
{
    public function __construct(
        private readonly CommunityWriteService $writeService,
    ) {}

    /**
     * Toggle a like or bookmark reaction on a community post.
     */
    public function toggleReaction(ToggleReactionRequest $request, CommunityPost $post): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $type = CommunityReactionType::from($request->string('type')->toString());
        $result = $this->writeService->toggleReaction($viewer, $post, $type);

        return response()->json([
            'data' => [
                'post_id' => $result['post_id'],
                'type' => $type->value,
                'active' => $result['active'],
                'likes_count' => $result['likes_count'],
            ],
        ]);
    }

    /**
     * Toggle a pure repost on a community post.
     */
    public function toggleRepost(Request $request, CommunityPost $post): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $result = $this->writeService->toggleRepost($viewer, $post);

        return response()->json([
            'data' => [
                'post_id' => $result['post_id'],
                'active' => $result['active'],
                'reposts_count' => $result['reposts_count'],
            ],
        ]);
    }

    /**
     * Cast or switch a vote on a community poll.
     */
    public function votePoll(VotePollRequest $request, CommunityPoll $poll): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $result = $this->writeService->votePoll($viewer, $poll, $request->integer('option_id'));

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Toggle following another user in the community.
     */
    public function toggleFollow(Request $request, User $user): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $result = $this->writeService->toggleFollow($viewer, $user);

        return response()->json([
            'data' => [
                'user_id' => $user->id,
                'following' => $result['following'],
            ],
        ]);
    }
}
