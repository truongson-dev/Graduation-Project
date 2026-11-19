<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Enums\LessonProgressStatus;
use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\UserLessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    /**
     * Show section detail with lessons and user statuses.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $section = Section::with(['lessons'])->findOrFail($id);
        $user = $request->user();

        $userProgress = UserLessonProgress::where('user_id', $user->id)
            ->whereIn('lesson_id', $section->lessons->pluck('id'))
            ->get()
            ->keyBy('lesson_id');

        $lessons = $section->lessons->map(function ($lesson) use ($userProgress) {
            $progress = $userProgress->get($lesson->id);

            return [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type->value,
                'sort_order' => $lesson->sort_order,
                'pass_threshold' => $lesson->pass_threshold,
                'xp_reward' => $lesson->xp_reward,
                'status' => $progress ? $progress->status->value : LessonProgressStatus::Locked->value,
                'best_score' => $progress?->best_score,
                'completed_at' => $progress?->completed_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => [
                'id' => $section->id,
                'learning_path_id' => $section->learning_path_id,
                'title' => $section->title,
                'subtitle' => $section->subtitle,
                'icon' => $section->icon,
                'sort_order' => $section->sort_order,
                'lessons' => $lessons,
            ],
        ]);
    }
}
