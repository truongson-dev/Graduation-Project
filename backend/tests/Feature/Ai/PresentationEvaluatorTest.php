<?php

use App\Ai\Agents\PresentationEvaluator;

it('defines instructions and structured schema for presentation evaluation', function () {
    $agent = new PresentationEvaluator(
        slideContent: 'Slide 1: Giới thiệu dự án SoftSkill AI.',
        transcript: 'Hôm nay tôi xin trình bày về nền tảng SoftSkill AI.',
        duration: '03:15',
        wordsPerMinute: 120,
        fillersCount: 2,
        eyeContactPercent: 80,
        postureScore: 85,
    );

    expect((string) $agent->instructions())->toContain('huấn luyện viên kỹ năng thuyết trình')
        ->and($agent->timeout())->toBe(60);
});
