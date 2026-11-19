<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Services\Learning\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(
        protected GamificationService $gamificationService,
    ) {}

    /**
     * Get user gamification status.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $gamification = $this->gamificationService->getGamification($user);

        return response()->json([
            'data' => [
                'total_xp' => $gamification->total_xp,
                'current_streak' => $gamification->current_streak,
                'longest_streak' => $gamification->longest_streak,
                'lives_count' => $gamification->lives_count,
                'lives_max' => GamificationService::MAX_LIVES,
                'lives_refill_at' => $gamification->lives_refill_at?->toIso8601String(),
                'tournament_tier' => $gamification->tournament_tier,
                'tournament_rank' => $gamification->tournament_rank,
            ],
        ]);
    }

    /**
     * Consume a life when user starts an attempt.
     */
    public function consumeLife(Request $request): JsonResponse
    {
        $user = $request->user();
        $gamification = $this->gamificationService->consumeLife($user);

        return response()->json([
            'data' => [
                'lives_count' => $gamification->lives_count,
                'lives_max' => GamificationService::MAX_LIVES,
                'lives_refill_at' => $gamification->lives_refill_at?->toIso8601String(),
            ],
        ]);
    }
}
