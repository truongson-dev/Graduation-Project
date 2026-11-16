<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLearningPathController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => LearningPath::query()->orderBy('sort_order')->get()]);
    }

    public function update(Request $request, LearningPath $learningPath): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:120'],
            'lessons' => ['required', 'array', 'min:1'],
            'lessons.*.title' => ['required', 'string', 'max:160'],
            'lessons.*.sort_order' => ['required', 'integer', 'min:1'],
        ]);

        $learningPath->update($data);

        return response()->json(['data' => $learningPath->fresh()]);
    }
}
