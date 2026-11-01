<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\CacheInstructions;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

#[CacheInstructions]
class PresentationEvaluator implements Agent, HasStructuredOutput
{
    use Promptable;

    public function __construct(
        public readonly string $slideContent,
        public readonly string $transcript,
        public readonly string $duration,
        public readonly int $wordsPerMinute,
        public readonly int $fillersCount,
        public readonly int $eyeContactPercent,
        public readonly int $postureScore,
        public readonly string $language = 'vi',
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
Bạn là chuyên gia huấn luyện viên kỹ năng thuyết trình chuyên nghiệp cho sinh viên Việt Nam. Nhiệm vụ của bạn là đối chiếu giữa NỘI DUNG SLIDE và LỜI NÓI THUYẾT TRÌNH THỰC TẾ của sinh viên để đánh giá toàn diện theo 4 trụ cột:

1. Trụ cột 1 - Độ bao quát Slide (slide_coverage_score: 0-100): Đánh giá xem sinh viên đã trình bày đủ các luận điểm chính trong slide chưa.
2. Trụ cột 2 - Chất lượng Diễn giải & Đọc chép (is_reading_slides: boolean, elaboration_quality: string): 
   - is_reading_slides: Đặt là true nếu phần lớn lời nói chỉ là đọc lại nguyên văn các câu chữ trên slide. Đặt là false nếu sinh viên biết tóm lược, mở rộng ý, đưa ví dụ minh họa và dùng từ ngữ của riêng mình.
   - elaboration_quality: Nhận xét cụ thể về khả năng giải thích, phát triển luận điểm.
3. Trụ cột 3 - Kỹ năng Giọng nói (voice_feedback: string): Nhận xét dựa trên thời lượng, tốc độ nói (WPM chuẩn tiếng Việt thường là 110-140 từ/phút) và tần suất từ đệm ("à, ừm, thì là").
4. Trụ cột 4 - Ngôn ngữ Cơ thể (body_language_feedback: string): Nhận xét về tỉ lệ giao tiếp mắt (eye contact) và tư thế dáng người (posture).

Yêu cầu:
- Nhận xét bằng tiếng Việt, chân thành, mang tính xây dựng cao.
- strengths: 1-3 điểm mạnh cụ thể.
- improvements: 1-3 điểm yếu cần khắc phục ngay.
- actionable_tips: 1-2 mẹo hành động cụ thể cho lần thuyết trình tiếp theo.
PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     *
     * @return array<string, mixed>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'overall_score' => $schema->integer()->min(0)->max(100)->required(),
            'is_reading_slides' => $schema->boolean()->required(),
            'slide_coverage_score' => $schema->integer()->min(0)->max(100)->required(),
            'elaboration_quality' => $schema->string()->required(),
            'voice_feedback' => $schema->string()->required(),
            'body_language_feedback' => $schema->string()->required(),
            'strengths' => $schema->array()->items($schema->string())->required(),
            'improvements' => $schema->array()->items($schema->string())->required(),
            'actionable_tips' => $schema->array()->items($schema->string())->required(),
        ];
    }

    /**
     * Get the number of seconds before the provider request times out.
     */
    public function timeout(): int
    {
        return 60;
    }
}
