<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PresentationSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $completed = PresentationSession::query()->where('status', 'completed');

        return response()->json(['data' => [
            'users' => [
                'total' => User::query()->count(),
                'active_today' => User::query()->where('updated_at', '>=', now()->startOfDay())->count(),
            ],
            'presentations' => [
                'total' => PresentationSession::query()->count(),
                'completed' => (clone $completed)->count(),
            ],
            'ai' => [
                'average_score' => round((float) ((clone $completed)->whereNotNull('overall_score')->avg('overall_score') ?? 0), 1),
                'average_words_per_minute' => round((float) ((clone $completed)->whereNotNull('words_per_minute')->avg('words_per_minute') ?? 0), 1),
                'average_fillers' => round((float) ((clone $completed)->whereNotNull('fillers_count')->avg('fillers_count') ?? 0), 1),
                'average_eye_contact' => round((float) ((clone $completed)->avg('eye_contact_percent') ?? 0), 1),
                'average_posture' => round((float) ((clone $completed)->avg('posture_score') ?? 0), 1),
            ],
            'pending_feedback' => 0,
            'activity' => collect(range(6, 0))->map(function (int $daysAgo): array {
                $date = now()->subDays($daysAgo)->toDateString();

                return [
                    'date' => $date,
                    'sessions' => PresentationSession::query()->whereDate('created_at', $date)->count(),
                    'active_users' => User::query()->whereDate('updated_at', $date)->count(),
                ];
            })->values()->all(),
        ]]);
    }
}
