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
        public readonly string $duration,
        public readonly int $eyeContactPercent,
        public readonly int $postureScore,
        public readonly string $language = 'vi',
        public readonly ?string $transcript = null,
        public readonly ?int $wordsPerMinute = null,
        public readonly ?int $fillersCount = null,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        if ($this->language === 'en') {
            return <<<'PROMPT'
Bạn là chuyên gia huấn luyện viên kỹ năng thuyết trình chuyên nghiệp (English Presentation Coach) cho sinh viên Việt Nam. Sinh viên đang thực hành thuyết trình bằng TIẾNG ANH (English). Nhiệm vụ của bạn là lắng nghe trực tiếp tệp âm thanh thuyết trình được đính kèm, đối chiếu với NỘI DUNG SLIDE và các thông số cảm biến để thực hiện đánh giá toàn diện:

1. Trích xuất âm thanh và định lượng:
   - transcript: Trích xuất lại toàn bộ nội dung lời nói của sinh viên bằng TIẾNG ANH (English) một cách chuẩn xác, đúng ngữ pháp, có đầy đủ dấu câu và phân đoạn hợp lý. Giữ nguyên tiếng Anh trong transcript, không dịch.
   - words_per_minute: Tính tốc độ nói (chuẩn thuyết trình tiếng Anh thông thường là 130-160 từ/phút).
   - fillers_count: Đếm chính xác số lần phát ra từ đệm hoặc âm ngập ngừng tiếng Anh (ví dụ: "um", "uh", "like", "you know", "actually", "basically", "so...", lặp từ).

2. Đánh giá toàn diện theo 4 trụ cột:
   - Trụ cột 1 - Độ bao quát Slide (slide_coverage_score: 0-100): Đánh giá xem sinh viên đã trình bày đủ các luận điểm chính trong slide chưa.
   - Trụ cột 2 - Chất lượng Diễn giải & Đọc chép (is_reading_slides: boolean, elaboration_quality: string):
     * is_reading_slides: Đặt là true nếu phần lớn lời nói chỉ là đọc lại nguyên văn câu chữ trên slide. Đặt là false nếu sinh viên biết diễn đạt bằng từ vựng và câu cú của mình, tóm lược, mở rộng ý và đưa ví dụ minh họa bằng tiếng Anh.
     * elaboration_quality: Nhận xét cụ thể về vốn từ vựng, ngữ pháp, độ lưu loát và khả năng phát triển luận điểm bằng tiếng Anh.
   - Trụ cột 3 - Kỹ năng Giọng nói & Phát âm (voice_feedback: string): Nhận xét dựa trên âm thanh thực tế về phát âm tiếng Anh (pronunciation, ending sounds, trọng âm, ngữ điệu intonation), ngắt nghỉ, năng lượng và tốc độ nói.
   - Trụ cột 4 - Ngôn ngữ Cơ thể (body_language_feedback: string): Nhận xét kết hợp tỉ lệ giao tiếp mắt (eye contact) và điểm tư thế (posture).

3. Tổng kết và định hướng:
   - overall_score: Điểm tổng kết toàn diện từ 0-100.
   - strengths: 1-3 điểm mạnh cụ thể (khen ngợi phát âm, từ vựng hoặc phong thái tự tin).
   - improvements: 1-3 điểm yếu cần khắc phục ngay (về phát âm, lỗi ngữ pháp phổ biến, hoặc từ đệm).
   - actionable_tips: 1-2 mẹo hành động cụ thể cho lần thuyết trình tiếng Anh tiếp theo.

Yêu cầu ngôn ngữ:
- Toàn bộ nhận xét phản hồi (voice_feedback, body_language_feedback, strengths, improvements, actionable_tips, elaboration_quality) được viết bằng tiếng Việt chân thành, gần gũi, mang tính xây dựng cao để sinh viên Việt Nam dễ tiếp thu (có thể trích dẫn từ hoặc cụm từ tiếng Anh của sinh viên khi góp ý sửa phát âm/từ vựng).
- Riêng trường `transcript` phải là tiếng Anh gốc mà sinh viên đã nói.
PROMPT;
        }

        return <<<'PROMPT'
Bạn là chuyên gia huấn luyện viên kỹ năng thuyết trình chuyên nghiệp cho sinh viên Việt Nam. Nhiệm vụ của bạn là lắng nghe trực tiếp tệp âm thanh thuyết trình được đính kèm, đối chiếu với NỘI DUNG SLIDE và các thông số cảm biến để thực hiện đánh giá toàn diện:

1. Trích xuất âm thanh và định lượng:
   - transcript: Trích xuất lại toàn bộ nội dung lời nói của sinh viên bằng tiếng Việt một cách chuẩn xác, đúng ngữ nghĩa, có đầy đủ dấu câu và phân đoạn hợp lý.
   - words_per_minute: Tính tốc độ nói (chuẩn tiếng Việt thông thường là 110-140 từ/phút).
   - fillers_count: Đếm chính xác số lần phát ra từ đệm hoặc âm ngập ngừng (ví dụ: "à", "ừm", "ờ", "kiểu như", "thì là", lặp từ).

2. Đánh giá toàn diện theo 4 trụ cột:
   - Trụ cột 1 - Độ bao quát Slide (slide_coverage_score: 0-100): Đánh giá xem sinh viên đã trình bày đủ các luận điểm chính trong slide chưa.
   - Trụ cột 2 - Chất lượng Diễn giải & Đọc chép (is_reading_slides: boolean, elaboration_quality: string):
     * is_reading_slides: Đặt là true nếu phần lớn lời nói chỉ là đọc lại nguyên văn câu chữ trên slide. Đặt là false nếu sinh viên biết diễn giải bằng lời của mình, tóm lược, mở rộng ý và đưa ví dụ minh họa.
     * elaboration_quality: Nhận xét cụ thể về khả năng giải thích, phát triển luận điểm.
   - Trụ cột 3 - Kỹ năng Giọng nói (voice_feedback: string): Nhận xét dựa trên âm thanh thực tế về ngữ điệu, cao độ, ngắt nghỉ, phát âm, năng lượng và tốc độ nói.
   - Trụ cột 4 - Ngôn ngữ Cơ thể (body_language_feedback: string): Nhận xét kết hợp tỉ lệ giao tiếp mắt (eye contact) và điểm tư thế (posture).

3. Tổng kết và định hướng:
   - overall_score: Điểm tổng kết toàn diện từ 0-100.
   - strengths: 1-3 điểm mạnh cụ thể.
   - improvements: 1-3 điểm yếu cần khắc phục ngay.
   - actionable_tips: 1-2 mẹo hành động cụ thể cho lần thuyết trình tiếp theo.

Yêu cầu ngôn ngữ:
- Phản hồi bằng tiếng Việt chân thành, mang tính xây dựng cao.
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
            'transcript' => $schema->string()->required(),
            'words_per_minute' => $schema->integer()->min(0)->max(500)->required(),
            'fillers_count' => $schema->integer()->min(0)->max(500)->required(),
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
        return 180;
    }
}
