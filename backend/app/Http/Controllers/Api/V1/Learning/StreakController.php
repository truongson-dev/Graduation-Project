<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Services\Learning\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StreakController extends Controller
{
    public function __construct(
        protected GamificationService $gamificationService,
    ) {}

    /**
     * Get user streak data for the current week.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $streak = $this->gamificationService->getStreakData($user);

        return response()->json([
            'data' => $streak,
        ]);
    }
}
