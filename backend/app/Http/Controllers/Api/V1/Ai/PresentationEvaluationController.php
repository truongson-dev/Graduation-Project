<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Ai\Agents\PresentationEvaluator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\EvaluatePresentationRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Ai\Exceptions\RateLimitedException;
use Throwable;

class PresentationEvaluationController extends Controller
{
    /**
     * Evaluate a slide presentation delivery and return 4-pillar structured feedback.
     */
    public function __invoke(EvaluatePresentationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $agent = new PresentationEvaluator(
            slideContent: (string) $validated['slide_content'],
            transcript: (string) $validated['transcript'],
            duration: (string) $validated['duration'],
            wordsPerMinute: (int) $validated['words_per_minute'],
            fillersCount: (int) $validated['fillers_count'],
            eyeContactPercent: (int) $validated['eye_contact_percent'],
            postureScore: (int) $validated['posture_score'],
            language: (string) ($validated['language'] ?? 'vi'),
        );

        try {
            $response = $agent->prompt($this->buildPrompt($agent));
        } catch (Throwable $exception) {
            report($exception);

            if ($exception instanceof RateLimitedException) {
                return response()->json([
                    'message' => 'Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.',
                ], 429);
            }

            return response()->json([
                'message' => 'Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại.',
            ], 502);
        }

        $feedback = $response->structured;

        return response()->json([
            'data' => [
                'overall_score' => (int) ($feedback['overall_score'] ?? 0),
                'is_reading_slides' => (bool) ($feedback['is_reading_slides'] ?? false),
                'slide_coverage_score' => (int) ($feedback['slide_coverage_score'] ?? 0),
                'elaboration_quality' => (string) ($feedback['elaboration_quality'] ?? ''),
                'voice_feedback' => (string) ($feedback['voice_feedback'] ?? ''),
                'body_language_feedback' => (string) ($feedback['body_language_feedback'] ?? ''),
                'strengths' => $this->strings($feedback['strengths'] ?? []),
                'improvements' => $this->strings($feedback['improvements'] ?? []),
                'actionable_tips' => $this->strings($feedback['actionable_tips'] ?? []),
            ],
        ]);
    }

    /**
     * Build the prompt with clearly delimited untrusted learner content.
     */
    private function buildPrompt(PresentationEvaluator $agent): string
    {
        return implode("\n\n", [
            "THÔNG SỐ PHIÊN THUYẾT TRÌNH:\n- Thời lượng: {$agent->duration}\n- Tốc độ nói: {$agent->wordsPerMinute} từ/phút\n- Số từ đệm: {$agent->fillersCount}\n- Tỉ lệ giao tiếp mắt: {$agent->eyeContactPercent}%\n- Điểm tư thế: {$agent->postureScore}/100",
            "NỘI DUNG TRÊN CÁC TRANG SLIDE:\n<<<\n{$agent->slideContent}\n>>>",
            "LỜI NÓI THUYẾT TRÌNH CỦA NGƯỜI HỌC (TRANSCRIPT):\n<<<\n{$agent->transcript}\n>>>",
        ]);
    }

    /**
     * Normalize a list value into an array of strings.
     *
     * @return array<int, string>
     */
    private function strings(mixed $value): array
    {
        return array_values(array_map(
            static fn (mixed $item): string => (string) $item,
            is_array($value) ? $value : [],
        ));
    }
}
