<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Enums\LessonProgressStatus;
use App\Enums\LessonType;
use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\UserLessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonController extends Controller
{
    /**
     * Show lesson detail for learning. Correct answers are hidden for quiz lessons.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $lesson = Lesson::with('section')->findOrFail($id);
        $user = $request->user();

        $progress = UserLessonProgress::where('user_id', $user->id)
            ->where('lesson_id', $lesson->id)
            ->first();

        $content = $lesson->content_json ?? [];

        // For quiz lessons, sanitize to hide correct answers
        if ($lesson->type === LessonType::Quiz && isset($content['questions'])) {
            $sanitizedQuestions = array_map(function ($q) {
                return [
                    'text' => $q['text'] ?? '',
                    'options' => $q['options'] ?? [],
                ];
            }, $content['questions']);

            $content['questions'] = $sanitizedQuestions;
        }

        return response()->json([
            'data' => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type->value,
                'pass_threshold' => $lesson->pass_threshold,
                'xp_reward' => $lesson->xp_reward,
                'section' => [
                    'id' => $lesson->section->id,
                    'title' => $lesson->section->title,
                ],
                'status' => $progress ? $progress->status->value : LessonProgressStatus::Locked->value,
                'best_score' => $progress?->best_score,
                'content' => $content,
            ],
        ]);
    }
}
