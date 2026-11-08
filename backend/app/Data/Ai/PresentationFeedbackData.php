<?php

namespace App\Data\Ai;

use Spatie\LaravelData\Data;

class PresentationFeedbackData extends Data
{
    /**
     * @param  array<int, string>  $strengths
     * @param  array<int, string>  $improvements
     * @param  array<int, string>  $actionable_tips
     */
    public function __construct(
        public string $transcript,
        public int $words_per_minute,
        public int $fillers_count,
        public int $overall_score,
        public bool $is_reading_slides,
        public int $slide_coverage_score,
        public string $elaboration_quality,
        public string $voice_feedback,
        public string $body_language_feedback,
        public array $strengths,
        public array $improvements,
        public array $actionable_tips,
    ) {}

    /**
     * Build from raw structured AI agent response array.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromStructured(array $data): self
    {
        $toStrings = static function (mixed $value): array {
            return array_values(array_map(
                static fn (mixed $item): string => (string) $item,
                is_array($value) ? $value : [],
            ));
        };

        return new self(
            transcript: (string) ($data['transcript'] ?? ''),
            words_per_minute: (int) ($data['words_per_minute'] ?? 0),
            fillers_count: (int) ($data['fillers_count'] ?? 0),
            overall_score: (int) ($data['overall_score'] ?? 0),
            is_reading_slides: (bool) ($data['is_reading_slides'] ?? false),
            slide_coverage_score: (int) ($data['slide_coverage_score'] ?? 0),
            elaboration_quality: (string) ($data['elaboration_quality'] ?? ''),
            voice_feedback: (string) ($data['voice_feedback'] ?? ''),
            body_language_feedback: (string) ($data['body_language_feedback'] ?? ''),
            strengths: $toStrings($data['strengths'] ?? []),
            improvements: $toStrings($data['improvements'] ?? []),
            actionable_tips: $toStrings($data['actionable_tips'] ?? []),
        );
    }
}
