<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use App\Services\Learning\ProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function __construct(
        protected ProgressService $progressService,
    ) {}

    /**
     * Get overall learning progress summary for the user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $path = LearningPath::where('slug', 'ky-nang-mem')
            ->where('is_active', true)
            ->first() ?? LearningPath::where('is_active', true)->first();

        if (! $path) {
            return response()->json([
                'data' => [
                    'completed_sections' => 0,
                    'total_sections' => 0,
                    'completed_lessons' => 0,
                    'total_lessons' => 0,
                    'percentage' => 0,
                    'next_lesson' => null,
                ],
            ]);
        }

        $progress = $this->progressService->getPathProgress($user, $path);

        return response()->json([
            'data' => array_merge([
                'path_title' => $path->title,
                'path_slug' => $path->slug,
            ], $progress['summary']),
        ]);
    }
}
