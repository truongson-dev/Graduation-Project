<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use Illuminate\Http\JsonResponse;

class LearningPathController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => LearningPath::query()
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'title', 'subtitle', 'icon', 'lessons'])]);
    }
}
