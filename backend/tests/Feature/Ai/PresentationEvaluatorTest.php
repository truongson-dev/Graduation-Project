<?php

use App\Ai\Agents\PresentationEvaluator;
use Illuminate\Contracts\JsonSchema\JsonSchema;

it('defines instructions, schema, and 180s timeout for presentation evaluation', function () {
    $agent = new PresentationEvaluator(
        slideContent: 'Slide 1: Giới thiệu dự án SoftSkill AI.',
        duration: '03:15',
        eyeContactPercent: 80,
        postureScore: 85,
    );

    $instructions = (string) $agent->instructions();

    expect($instructions)->toContain('huấn luyện viên kỹ năng thuyết trình')
        ->and($instructions)->toContain('tệp âm thanh')
        ->and($instructions)->toContain('transcript')
        ->and($instructions)->toContain('words_per_minute')
        ->and($instructions)->toContain('fillers_count')
        ->and($instructions)->toContain('slide_coverage_score')
        ->and($instructions)->toContain('is_reading_slides')
        ->and($instructions)->toContain('voice_feedback')
        ->and($instructions)->toContain('body_language_feedback')
        ->and($agent->timeout())->toBe(180);
});

it('customizes instructions for english presentation when language is en', function () {
    $agent = new PresentationEvaluator(
        slideContent: 'Slide 1: AI Presentation Practice Overview.',
        duration: '02:45',
        eyeContactPercent: 85,
        postureScore: 90,
        language: 'en',
    );

    $instructions = (string) $agent->instructions();

    expect($instructions)->toContain('English Presentation Coach')
        ->and($instructions)->toContain('TIẾNG ANH (English)')
        ->and($instructions)->toContain('130-160')
        ->and($instructions)->toContain('um')
        ->and($instructions)->toContain('ending sounds')
        ->and($agent->timeout())->toBe(180);
});

it('defines schema containing audio transcript metrics and 4 pillars', function () {
    $agent = new PresentationEvaluator(
        slideContent: 'Slide 1',
        duration: '01:00',
        eyeContactPercent: 80,
        postureScore: 85,
    );

    $factory = new \Illuminate\JsonSchema\JsonSchemaTypeFactory;
    $definition = $agent->schema($factory);

    expect($definition)->toHaveKeys([
        'transcript',
        'words_per_minute',
        'fillers_count',
        'overall_score',
        'is_reading_slides',
        'slide_coverage_score',
        'elaboration_quality',
        'voice_feedback',
        'body_language_feedback',
        'strengths',
        'improvements',
        'actionable_tips',
    ]);
});
