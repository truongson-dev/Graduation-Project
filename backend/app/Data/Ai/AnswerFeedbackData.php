<?php

namespace App\Data\Ai;

use Spatie\LaravelData\Data;

class AnswerFeedbackData extends Data
{
    /**
     * @param  array<int, string>  $strengths
     * @param  array<int, string>  $improvements
     */
    public function __construct(
        public int $score,
        public string $summary,
        public array $strengths,
        public array $improvements,
    ) {}

    /**
     * Build from raw structured AI agent response array.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromStructured(array $data): self
    {
        $strengths = array_values(array_map(
            static fn (mixed $item): string => (string) $item,
            is_array($data['strengths'] ?? null) ? $data['strengths'] : [],
        ));

        $improvements = array_values(array_map(
            static fn (mixed $item): string => (string) $item,
            is_array($data['improvements'] ?? null) ? $data['improvements'] : [],
        ));

        return new self(
            score: (int) ($data['score'] ?? 0),
            summary: (string) ($data['summary'] ?? ''),
            strengths: $strengths,
            improvements: $improvements,
        );
    }
}
