<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\SubmitAttemptRequest;
use App\Models\Lesson;
use App\Models\UserLessonAttempt;
use App\Services\Learning\LessonAttemptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonAttemptController extends Controller
{
    public function __construct(
        protected LessonAttemptService $attemptService,
    ) {}

    /**
     * Submit an attempt for a lesson.
     */
    public function store(SubmitAttemptRequest $request, int $id): JsonResponse
    {
        $lesson = Lesson::with('section')->findOrFail($id);
        $user = $request->user();

        $result = $this->attemptService->submit($user, $lesson, $request->validated());

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Get attempt history for this lesson.
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $attempts = UserLessonAttempt::where('user_id', $user->id)
            ->where('lesson_id', $id)
            ->orderByDesc('attempt_number')
            ->get();

        return response()->json([
            'data' => $attempts,
        ]);
    }
}
