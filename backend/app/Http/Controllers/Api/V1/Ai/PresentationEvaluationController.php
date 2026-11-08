<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\EvaluatePresentationRequest;
use App\Jobs\EvaluatePresentationJob;
use App\Models\PresentationSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class PresentationEvaluationController extends Controller
{
    /**
     * Accept a presentation submission, store private audio, create session, and dispatch background job.
     */
    public function __invoke(EvaluatePresentationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Calculate duration in seconds from duration string (e.g. "05:30" -> 330)
        $durationSeconds = $this->parseDurationToSeconds((string) $validated['duration']);

        $audioPath = null;
        if ($request->hasFile('audio') && $request->file('audio')->isValid()) {
            $audioFile = $request->file('audio');
            $extension = $audioFile->getClientOriginalExtension() ?: 'webm';
            $fileName = Str::uuid().'.'.$extension;
            $audioPath = $audioFile->storeAs('presentations/audio', $fileName, 'local');
        }

        $session = PresentationSession::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'status' => 'processing',
            'title' => $validated['title'] ?? 'Bài thuyết trình không tiêu đề',
            'slide_content' => $validated['slide_content'] ?? '',
            'duration_seconds' => $durationSeconds,
            'audio_path' => $audioPath,
            'eye_contact_percent' => (int) $validated['eye_contact_percent'],
            'posture_score' => (int) $validated['posture_score'],
            'language' => (string) ($validated['language'] ?? 'vi'),
            'transcript' => $validated['transcript'] ?? null,
            'words_per_minute' => isset($validated['words_per_minute']) ? (int) $validated['words_per_minute'] : null,
            'fillers_count' => isset($validated['fillers_count']) ? (int) $validated['fillers_count'] : null,
            'started_processing_at' => now(),
        ]);

        EvaluatePresentationJob::dispatch($session);

        return response()->json([
            'message' => 'Bài thuyết trình đã được tiếp nhận và đang được AI phân tích ngầm.',
            'data' => [
                'id' => $session->id,
                'status' => $session->status,
                'created_at' => $session->created_at?->toIso8601String(),
            ],
        ], 202);
    }

    /**
     * Parse duration label (MM:SS or HH:MM:SS) to total seconds.
     */
    private function parseDurationToSeconds(string $duration): int
    {
        $parts = array_map('intval', explode(':', trim($duration)));

        if (count($parts) === 3) {
            return ($parts[0] * 3600) + ($parts[1] * 60) + $parts[2];
        }

        if (count($parts) === 2) {
            return ($parts[0] * 60) + $parts[1];
        }

        return max(0, intval($duration));
    }
}
