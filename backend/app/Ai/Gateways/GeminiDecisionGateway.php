<?php

namespace App\Ai\Gateways;

use Illuminate\Http\UploadedFile;
use Laravel\Ai\Classification\Boolean;
use Laravel\Ai\Classification\Choice;
use Laravel\Ai\Classification\Score;
use Laravel\Ai\Contracts\Gateway\ClassificationGateway;
use Laravel\Ai\Contracts\Providers\ClassificationProvider;
use Laravel\Ai\Contracts\Question;
use Laravel\Ai\Files\File;
use Laravel\Ai\Gateway\Concerns\HandlesFailoverErrors;
use Laravel\Ai\Gateway\Gemini\Concerns\CreatesGeminiClient;
use Laravel\Ai\Responses\ClassificationResponse;
use Laravel\Ai\Responses\Data\Answer;
use Laravel\Ai\Responses\Data\BooleanAnswer;
use Laravel\Ai\Responses\Data\ChoiceAnswer;
use Laravel\Ai\Responses\Data\Meta;
use Laravel\Ai\Responses\Data\ScoreAnswer;
use Laravel\Ai\Responses\Data\TextUsage;

class GeminiDecisionGateway implements ClassificationGateway
{
    use CreatesGeminiClient;
    use HandlesFailoverErrors;

    /**
     * Evaluate closed-ended questions against shared input via Gemini Decisions API.
     *
     * @param  string|array<string, mixed>  $state
     * @param  array<string, Question>  $questions
     * @param  array<string, mixed>  $providerOptions
     * @param  array<int|string, File|UploadedFile>  $attachments
     */
    public function classify(
        ClassificationProvider $provider,
        string $model,
        string|array $state,
        array $questions,
        int $timeout = 30,
        array $providerOptions = [],
        array $attachments = [],
    ): ClassificationResponse {
        $response = $this->withErrorHandling(
            $provider->name(),
            fn () => $this->client($provider, $timeout)->post('decisions', array_merge($providerOptions, [
                'model' => $model,
                'input' => $state,
                'questions' => array_map($this->mapQuestion(...), $questions),
            ])),
        );

        /** @var array<string, mixed> $data */
        $data = $response->json() ?? [];
        $answers = [];

        foreach ($data['answers'] ?? [] as $key => $answer) {
            if (is_string($key) && is_array($answer) && ($mapped = $this->mapAnswer($answer, $questions[$key] ?? null))) {
                $answers[$key] = $mapped;
            }
        }

        $usage = is_array($data['usage'] ?? null) ? $data['usage'] : [];

        return new ClassificationResponse(
            $answers,
            new TextUsage(
                inputTokens: (int) ($usage['total_input_tokens'] ?? $usage['input_tokens'] ?? 0),
                outputTokens: (int) ($usage['total_output_tokens'] ?? $usage['output_tokens'] ?? 0),
            ),
            new Meta($provider->name(), (string) ($data['model'] ?? $model)),
        );
    }

    /**
     * Map a Laravel AI Question object to the Gemini Decisions wire format.
     *
     * @return array<string, mixed>
     */
    protected function mapQuestion(Question $question): array
    {
        return match (true) {
            $question instanceof Boolean => array_filter([
                'type' => 'noul',
                'instructions' => $question->instructions,
                'criteria' => $question->criteria,
            ], static fn (mixed $value): bool => $value !== null),
            $question instanceof Choice => [
                'type' => 'choice',
                'instructions' => $question->instructions,
                'criteria' => $question->options,
            ],
            $question instanceof Score => [
                'type' => 'score',
                'instructions' => $question->instructions,
                'criteria' => $question->levels,
            ],
            default => $question->toArray(),
        };
    }

    /**
     * Map a raw Gemini Decisions answer item into a typed Answer instance.
     *
     * @param  array<string, mixed>  $answer
     */
    protected function mapAnswer(array $answer, ?Question $question = null): ?Answer
    {
        return match ($answer['type'] ?? null) {
            'noul' => isset($answer['noul']) ? new BooleanAnswer((float) $answer['noul']) : null,
            'choice' => $this->mapChoiceAnswer($answer),
            'score' => $this->mapScoreAnswer($answer, $question),
            default => null,
        };
    }

    /**
     * Map a choice answer, resolving top choice from probabilities if omitted.
     *
     * @param  array<string, mixed>  $answer
     */
    private function mapChoiceAnswer(array $answer): ?ChoiceAnswer
    {
        /** @var array<string, float> $probabilities */
        $probabilities = is_array($answer['probabilities'] ?? null)
            ? array_map(static fn (mixed $v): float => (float) $v, $answer['probabilities'])
            : [];

        $choice = $answer['choice'] ?? $answer['top_choice'] ?? null;

        if (! is_string($choice) && $probabilities !== []) {
            $maxProb = max($probabilities);
            $matched = array_search($maxProb, $probabilities, true);
            $choice = is_string($matched) ? $matched : null;
        }

        if (! is_string($choice)) {
            return null;
        }

        return new ChoiceAnswer(
            $choice,
            $probabilities,
            isset($answer['confidence']) ? (float) $answer['confidence'] : null,
        );
    }

    /**
     * Map a score answer into a typed ScoreAnswer instance.
     *
     * @param  array<string, mixed>  $answer
     */
    private function mapScoreAnswer(array $answer, ?Question $question): ?ScoreAnswer
    {
        if (! isset($answer['score'])) {
            return null;
        }

        $probabilities = [];
        foreach (is_array($answer['probabilities'] ?? null) ? $answer['probabilities'] : [] as $level => $prob) {
            $probabilities[(int) $level] = (float) $prob;
        }
        ksort($probabilities);

        $rawLegend = $answer['legend'] ?? ($question instanceof Score ? $question->levels : []);
        $legend = [];
        foreach (is_array($rawLegend) ? $rawLegend : [] as $level => $label) {
            $legend[(int) $level] = $label;
        }
        ksort($legend);

        return new ScoreAnswer(
            (float) $answer['score'],
            $probabilities,
            $legend,
            isset($answer['confidence']) ? (float) $answer['confidence'] : null,
        );
    }
}
