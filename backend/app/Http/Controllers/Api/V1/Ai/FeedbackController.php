<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Ai\Agents\AnswerGrader;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\GradeAnswerRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Ai\Exceptions\RateLimitedException;
use Throwable;

class FeedbackController extends Controller
{
    /**
     * Grade a learner answer and return structured feedback.
     */
    public function __invoke(GradeAnswerRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $agent = new AnswerGrader(
            skill: (string) $validated['skill'],
            question: (string) $validated['question'],
            answer: (string) $validated['answer'],
            context: is_string($validated['context'] ?? null) ? $validated['context'] : null,
        );

        try {
            $response = $agent->prompt($this->prompt($agent));
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
                'score' => (int) ($feedback['score'] ?? 0),
                'summary' => (string) ($feedback['summary'] ?? ''),
                'strengths' => $this->strings($feedback['strengths'] ?? []),
                'improvements' => $this->strings($feedback['improvements'] ?? []),
            ],
        ]);
    }

    /**
     * Normalize a structured list value into a list of strings.
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

    /**
     * Build the grading prompt with clearly delimited, untrusted learner input.
     */
    private function prompt(AnswerGrader $agent): string
    {
        $sections = [
            'KỸ NĂNG: '.$agent->skill,
            "CÂU HỎI / TÌNH HUỐNG:\n<<<\n".$agent->question."\n>>>",
        ];

        if ($agent->context !== null) {
            $sections[] = "BỐI CẢNH THÊM:\n<<<\n".$agent->context."\n>>>";
        }

        $sections[] = "CÂU TRẢ LỜI CỦA NGƯỜI HỌC:\n<<<\n".$agent->answer."\n>>>";

        return implode("\n\n", $sections);
    }
}
