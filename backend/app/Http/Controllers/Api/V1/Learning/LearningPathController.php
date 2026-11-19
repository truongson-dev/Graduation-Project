<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use App\Services\Learning\ProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearningPathController extends Controller
{
    public function __construct(
        protected ProgressService $progressService,
    ) {}

    /**
     * List all active learning paths with user progress.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $paths = LearningPath::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $data = $paths->map(function (LearningPath $path) use ($user) {
            $progress = $this->progressService->getPathProgress($user, $path);

            return [
                'id' => $path->id,
                'title' => $path->title,
                'slug' => $path->slug,
                'description' => $path->description,
                'sections_count' => count($progress['sections']),
                'user_progress' => [
                    'completed_sections' => $progress['summary']['completed_sections'],
                    'total_sections' => $progress['summary']['total_sections'],
                    'percentage' => $progress['summary']['percentage'],
                ],
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Show learning path details with sections and roadmap nodes.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $path = LearningPath::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $user = $request->user();
        $progress = $this->progressService->getPathProgress($user, $path);

        return response()->json(['data' => $progress]);
    }
}
