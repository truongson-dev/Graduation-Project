<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Services\Learning\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function __construct(
        protected GamificationService $gamificationService,
    ) {}

    /**
     * Get weekly tournament leaderboard rankings.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $leaderboard = $this->gamificationService->getWeeklyLeaderboard($user);

        return response()->json([
            'data' => $leaderboard,
        ]);
    }
}
