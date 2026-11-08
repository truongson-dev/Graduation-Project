# Kế Hoạch Triển Khai: Đánh Giá Bài Thuyết Trình Bằng AI Multimodal & Bảng Ghi Chú Slide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế Web Speech API bằng ghi âm audio toàn bài thuyết trình gửi Gemini Multimodal xử lý 1 lần (vừa xuất transcript vừa chấm điểm 4 trụ cột), đồng thời thiết kế lại bảng bên phải thành tab "Ghi chú" trích xuất văn bản từ PDF (có nút chỉnh sửa bút chì và điều chỉnh cỡ chữ) cùng tab "AI nhận xét".

**Architecture:** Frontend sử dụng `MediaRecorder` ghi âm ngầm `audio/webm;codecs=opus` và đóng gói `FormData` gửi lên Laravel 13; Backend tiếp nhận tệp âm thanh và chuyển tiếp cho `PresentationEvaluator` thông qua tính năng đính kèm tệp đa phương thức của `laravel/ai` để Gemini trực tiếp nghe âm thanh, trích xuất transcript, tính WPM, đếm từ đệm và chấm điểm 4 trụ cột. Bảng bên phải hiển thị văn bản slide đồng bộ theo số trang, cho phép chỉnh sửa bằng textarea và tăng giảm cỡ chữ từ 14px đến 24px.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, pdfjs-dist, MediaRecorder API, Laravel 13, `laravel/ai` (Gemini Multimodal Driver), Pest PHP, Vitest, Testing Library.

**Spec:** [`docs/superpowers/specs/2026-11-07-presentation-multimodal-audio-evaluation-design.md`](file:///d:/Android-APP/softskill/docs/superpowers/specs/2026-11-07-presentation-multimodal-audio-evaluation-design.md)

## Global Constraints

- Không dùng `window.SpeechRecognition` hay Web Speech API trong mã nguồn mới.
- Định dạng audio chính là `audio/webm;codecs=opus` (fallback `audio/webm` nếu codec không hỗ trợ).
- Dung lượng file audio tối đa chấp nhận tại backend là 50MB (`max:51200`).
- Giao diện tab bên phải tuân thủ chuẩn thiết kế trong ảnh mẫu: Tab 1 "Ghi chú" (icon `edit_note`), Tab 2 "AI nhận xét" (icon `smart_toy`).
- Luôn chạy kiểm thử trước và sau mỗi thay đổi theo phương pháp TDD.

---

### Task 1: Nâng cấp Backend Request Validation & DTO `PresentationFeedbackData`

**Files:**
- Modify: `backend/app/Http/Requests/Ai/EvaluatePresentationRequest.php:1-30`
- Modify: `backend/app/Data/Ai/PresentationFeedbackData.php:1-52`
- Modify: `backend/tests/Feature/Ai/PresentationEvaluationTest.php:1-67`

**Interfaces:**
- Consumes: Route `POST /api/v1/ai/presentation/evaluate`
- Produces: `EvaluatePresentationRequest` chấp nhận file `audio` (required, file, max 50MB); `PresentationFeedbackData` có thêm các thuộc tính `transcript`, `words_per_minute`, `fillers_count`.

- [ ] **Step 1: Viết test kiểm tra validation mới cho request (đòi hỏi file audio, transcript không bắt buộc)**

Trong `backend/tests/Feature/Ai/PresentationEvaluationTest.php`, cập nhật test validation:

```php
it('validates required fields for presentation evaluation including audio file', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['audio', 'slide_content', 'duration', 'eye_contact_percent', 'posture_score']);
});

it('rejects invalid audio file extensions', function () {
    $user = User::factory()->create();
    $invalidFile = Illuminate\Http\UploadedFile::fake()->create('document.txt', 100, 'text/plain');

    $this->actingAs($user)
        ->post('/api/v1/ai/presentation/evaluate', [
            'audio' => $invalidFile,
            'slide_content' => 'Slide test',
            'duration' => '02:00',
            'eye_contact_percent' => 80,
            'posture_score' => 85,
        ], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['audio']);
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `cd backend; php artisan test --filter=PresentationEvaluationTest`  
Expected: FAIL với lỗi thiếu trường hoặc validation rules chưa khớp.

- [ ] **Step 3: Cập nhật `EvaluatePresentationRequest.php` và `PresentationFeedbackData.php`**

Trong `backend/app/Http/Requests/Ai/EvaluatePresentationRequest.php`:
```php
<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class EvaluatePresentationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'audio' => ['required', 'file', 'mimes:webm,wav,mp3,ogg,m4a', 'max:51200'],
            'slide_content' => ['required', 'string', 'max:25000'],
            'duration' => ['required', 'string', 'max:50'],
            'eye_contact_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'posture_score' => ['required', 'integer', 'min:0', 'max:100'],
            'language' => ['nullable', 'string', 'in:vi,en'],
            'transcript' => ['nullable', 'string', 'max:15000'],
            'words_per_minute' => ['nullable', 'integer', 'min:0', 'max:500'],
            'fillers_count' => ['nullable', 'integer', 'min:0', 'max:500'],
        ];
    }
}
```

Trong `backend/app/Data/Ai/PresentationFeedbackData.php`:
```php
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
```

- [ ] **Step 4: Chạy test để xác nhận các test validation mới đã PASS**

Run: `cd backend; php artisan test --filter=PresentationEvaluationTest`  
Expected: PASS validation tests.

- [ ] **Step 5: Commit thay đổi Task 1**

```bash
git add backend/app/Http/Requests/Ai/EvaluatePresentationRequest.php backend/app/Data/Ai/PresentationFeedbackData.php backend/tests/Feature/Ai/PresentationEvaluationTest.php
git commit -m "feat(ai): update presentation evaluation request validation and feedback DTO"
```

---

### Task 2: Cải tiến Agent `PresentationEvaluator` & `PresentationEvaluationController` Đa Phương Thức

**Files:**
- Modify: `backend/app/Ai/Agents/PresentationEvaluator.php:1-78`
- Modify: `backend/app/Http/Controllers/Api/V1/Ai/PresentationEvaluationController.php:1-67`
- Modify: `backend/tests/Feature/Ai/PresentationEvaluatorTest.php:1-18`
- Modify: `backend/tests/Feature/Ai/PresentationEvaluationTest.php`

**Interfaces:**
- Consumes: `UploadedFile` từ request; Schema JSON mở rộng.
- Produces: `$agent->prompt(..., attachments: [$audioFile])` trả về structured output gồm transcript, WPM, fillers_count và 4 trụ cột.

- [ ] **Step 1: Viết test cho Agent và Controller với tệp âm thanh giả lập (Fake Audio)**

Cập nhật `backend/tests/Feature/Ai/PresentationEvaluatorTest.php`:
```php
it('defines instructions and structured schema for multimodal presentation evaluation', function () {
    $agent = new PresentationEvaluator(
        slideContent: 'Slide 1: Giới thiệu dự án SoftSkill AI.',
        duration: '03:15',
        eyeContactPercent: 80,
        postureScore: 85,
    );

    expect((string) $agent->instructions())->toContain('tệp âm thanh')
        ->and($agent->instructions())->toContain('transcript')
        ->and($agent->timeout())->toBe(90);
});
```

Cập nhật test `evaluates presentation and returns structured 4-pillar feedback` trong `PresentationEvaluationTest.php`:
```php
it('evaluates presentation audio and returns structured 4-pillar feedback with transcript', function () {
    $user = User::factory()->create();

    PresentationEvaluator::fake([[
        'transcript' => 'Kính chào thầy cô, hôm nay em xin giới thiệu dự án AI giúp sinh viên nâng cao kỹ năng.',
        'words_per_minute' => 125,
        'fillers_count' => 2,
        'overall_score' => 88,
        'is_reading_slides' => false,
        'slide_coverage_score' => 85,
        'elaboration_quality' => 'Diễn giải rất tốt, có ví dụ thực tế.',
        'voice_feedback' => 'Tốc độ 125 từ/phút rất chuẩn, ngữ điệu truyền cảm, rất ít từ đệm.',
        'body_language_feedback' => 'Ánh mắt tự tin, dáng đứng vững vàng.',
        'strengths' => ['Bố cục rõ ràng', 'Không phụ thuộc slide'],
        'improvements' => ['Nói to hơn ở phần kết'],
        'actionable_tips' => ['Tập trung nhìn đều 3 hướng người nghe'],
    ]]);

    $audioFile = Illuminate\Http\UploadedFile::fake()->create('speech.webm', 1024, 'audio/webm');

    $response = $this->actingAs($user)->post('/api/v1/ai/presentation/evaluate', [
        'audio' => $audioFile,
        'slide_content' => 'Slide 1: Tổng quan dự án AI. Mục tiêu hỗ trợ sinh viên.',
        'duration' => '04:30',
        'eye_contact_percent' => 82,
        'posture_score' => 88,
        'language' => 'vi',
    ], ['Accept' => 'application/json']);

    $response->assertOk()
        ->assertJsonPath('data.transcript', 'Kính chào thầy cô, hôm nay em xin giới thiệu dự án AI giúp sinh viên nâng cao kỹ năng.')
        ->assertJsonPath('data.words_per_minute', 125)
        ->assertJsonPath('data.fillers_count', 2)
        ->assertJsonPath('data.overall_score', 88)
        ->assertJsonPath('data.is_reading_slides', false)
        ->assertJsonStructure([
            'data' => [
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
            ],
        ]);
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `cd backend; php artisan test --filter=Presentation`  
Expected: FAIL.

- [ ] **Step 3: Cập nhật `PresentationEvaluator.php` và `PresentationEvaluationController.php`**

Trong `backend/app/Ai/Agents/PresentationEvaluator.php`:
```php
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
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
Bạn là chuyên gia huấn luyện viên kỹ năng thuyết trình chuyên nghiệp cho sinh viên Việt Nam.
Nhiệm vụ của bạn là lắng nghe trực tiếp tệp âm thanh thuyết trình được đính kèm và đối chiếu với NỘI DUNG SLIDE được cung cấp để đánh giá toàn diện theo 4 trụ cột:

1. Bóc tách lời nói & Đo lường tốc độ:
   - transcript: Bóc tách toàn bộ lời nói của diễn giả trong tệp âm thanh thành văn bản tiếng Việt có dấu câu đầy đủ và mạch lạc.
   - words_per_minute: Tính tốc độ nói thực tế (tổng số từ nói ra chia cho số phút thời lượng). Chuẩn tiếng Việt thường là 110-140 từ/phút.
   - fillers_count: Đếm chính xác số lần diễn giả phát ra âm/từ đệm ngập ngừng ("à", "ừm", "ờ", "kiểu như", "thì là", lặp từ vô nghĩa).

2. Trụ cột 1 - Độ bao quát Slide (slide_coverage_score: 0-100): Đánh giá xem diễn giả đã trình bày đủ các luận điểm chính trong slide chưa.

3. Trụ cột 2 - Chất lượng Diễn giải & Đọc chép (is_reading_slides: boolean, elaboration_quality: string): 
   - is_reading_slides: Đặt là true nếu phần lớn lời nói chỉ là đọc lại nguyên văn các câu chữ trên slide. Đặt là false nếu sinh viên biết tóm lược, mở rộng ý, đưa ví dụ minh họa và dùng từ ngữ của riêng mình.
   - elaboration_quality: Nhận xét cụ thể về khả năng giải thích, phát triển luận điểm.

4. Trụ cột 3 - Kỹ năng Giọng nói (voice_feedback: string): Nhận xét chi tiết dựa trên âm thanh thực tế: ngữ điệu, cao độ, ngắt nghỉ, năng lượng, hơi thở và độ rõ ràng của phát âm.

5. Trụ cột 4 - Ngôn ngữ Cơ thể (body_language_feedback: string): Nhận xét về tỉ lệ giao tiếp mắt (eye contact) và tư thế dáng người (posture).

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
        return 90;
    }
}
```

Trong `backend/app/Http/Controllers/Api/V1/Ai/PresentationEvaluationController.php`:
```php
<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Ai\Agents\PresentationEvaluator;
use App\Data\Ai\PresentationFeedbackData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\EvaluatePresentationRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Ai\Exceptions\RateLimitedException;
use Throwable;

class PresentationEvaluationController extends Controller
{
    /**
     * Evaluate a slide presentation audio delivery and return 4-pillar structured feedback.
     */
    public function __invoke(EvaluatePresentationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $audioFile = $request->file('audio');

        $agent = new PresentationEvaluator(
            slideContent: (string) $validated['slide_content'],
            duration: (string) $validated['duration'],
            eyeContactPercent: (int) $validated['eye_contact_percent'],
            postureScore: (int) $validated['posture_score'],
            language: (string) ($validated['language'] ?? 'vi'),
        );

        try {
            $attachments = $audioFile ? [$audioFile] : [];
            $response = $agent->prompt($this->buildPrompt($agent), attachments: $attachments);
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
            'data' => PresentationFeedbackData::fromStructured($feedback)->toArray(),
        ]);
    }

    /**
     * Build the prompt with clearly delimited untrusted learner content.
     */
    private function buildPrompt(PresentationEvaluator $agent): string
    {
        return implode("\n\n", [
            "THÔNG SỐ PHIÊN THUYẾT TRÌNH:\n- Thời lượng ghi âm: {$agent->duration}\n- Tỉ lệ giao tiếp mắt: {$agent->eyeContactPercent}%\n- Điểm tư thế: {$agent->postureScore}/100",
            "NỘI DUNG TRÊN CÁC TRANG SLIDE ĐỐI CHIẾU:\n<<<\n{$agent->slideContent}\n>>>",
            "HÃY LẮNG NGHE TỆP ÂM THANH ĐÍNH KÈM ĐỂ TRÍCH XUẤT TRANSCRIPT, TÍNH TỐC ĐỘ WPM, ĐẾM TỪ ĐỆM VÀ ĐÁNH GIÁ 4 TRỤ CỘT.",
        ]);
    }
}
```

- [ ] **Step 4: Chạy test để xác nhận toàn bộ backend tests đã PASS**

Run: `cd backend; php artisan test --filter=Presentation`  
Expected: PASS toàn bộ 4/4 tests.

- [ ] **Step 5: Commit thay đổi Task 2**

```bash
git add backend/app/Ai/Agents/PresentationEvaluator.php backend/app/Http/Controllers/Api/V1/Ai/PresentationEvaluationController.php backend/tests/Feature/Ai/PresentationEvaluatorTest.php backend/tests/Feature/Ai/PresentationEvaluationTest.php
git commit -m "feat(ai): integrate multimodal audio attachment in PresentationEvaluator"
```

---

### Task 3: Cập nhật Frontend Client API & `GradePanel` Hỗ Trợ `FormData` & AI Metrics

**Files:**
- Modify: `frontend/src/lib/ai.ts:91-125`
- Modify: `frontend/src/components/Coach/GradePanel.tsx:1-120`
- Modify: `frontend/src/pages/PresentationReviewPage.tsx:1-150`

**Interfaces:**
- Consumes: `audioBlob: Blob | File`, `slideContent`, `duration`, `eyeContact`, `posture`, `language`
- Produces: `useEvaluatePresentation` gửi `FormData`; `GradePanel` hiển thị `transcript`, `words_per_minute`, `fillers_count` do AI trả về.

- [ ] **Step 1: Viết test cho `GradePanel` gửi `FormData` chứa file audio và hiển thị kết quả từ AI**

Tạo/cập nhật `frontend/src/components/Coach/GradePanel.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GradePanel } from './GradePanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as aiModule from '../../lib/ai';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('GradePanel Multimodal Evaluation', () => {
  it('submits audio blob via FormData and renders transcript and metrics returned by AI', async () => {
    const mockAudioBlob = new Blob(['fake audio content'], { type: 'audio/webm' });
    const mutateAsyncSpy = vi.fn().mockResolvedValue({
      transcript: 'Xin chào mọi người đây là bài thuyết trình của tôi.',
      words_per_minute: 130,
      fillers_count: 1,
      overall_score: 90,
      is_reading_slides: false,
      slide_coverage_score: 95,
      elaboration_quality: 'Rất rõ ràng và sinh động.',
      voice_feedback: 'Ngữ điệu tự nhiên, dõng dạc.',
      body_language_feedback: 'Dáng đứng chuẩn, mắt nhìn tốt.',
      strengths: ['Tự tin'],
      improvements: ['Nói to hơn'],
      actionable_tips: ['Tiếp tục phát huy'],
    });

    vi.spyOn(aiModule, 'useEvaluatePresentation').mockReturnValue({
      mutateAsync: mutateAsyncSpy,
      isPending: false,
    } as any);

    render(
      <GradePanel
        presentationReview={{
          audioBlob: mockAudioBlob,
          slideContent: 'Nội dung slide kiểm tra',
          duration: '02:30',
          eyeContact: 85,
          posture: 90,
          confidence: 88,
          fileName: 'presentation.pdf',
          language: 'vi',
          wordsPerMinute: 0,
          fillers: 0,
          transcript: '',
        }}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mutateAsyncSpy).toHaveBeenCalled();
    });

    expect(screen.getByText('Xin chào mọi người đây là bài thuyết trình của tôi.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `cd frontend; pnpm test GradePanel.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Cập nhật `frontend/src/lib/ai.ts` và `GradePanel.tsx`**

Cập nhật `frontend/src/lib/ai.ts`:
```ts
export interface PresentationEvaluationFeedback {
  transcript: string;
  words_per_minute: number;
  fillers_count: number;
  overall_score: number;
  is_reading_slides: boolean;
  slide_coverage_score: number;
  elaboration_quality: string;
  voice_feedback: string;
  body_language_feedback: string;
  strengths: string[];
  improvements: string[];
  actionable_tips: string[];
}

export function useEvaluatePresentation() {
  return useMutation<PresentationEvaluationFeedback, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await api.post<{ data: PresentationEvaluationFeedback }>(
        endpoints.ai.presentationEvaluate,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.data;
    },
  });
}
```

Cập nhật `frontend/src/components/Coach/GradePanel.tsx`:
Trong `performEvaluation`:
```ts
const performEvaluation = async () => {
  if (!presentationReview.audioBlob) return;

  const formData = new FormData();
  formData.append(
    'audio',
    presentationReview.audioBlob,
    'presentation-audio.webm'
  );
  formData.append('slide_content', presentationReview.slideContent || '[Chưa có nội dung slide]');
  formData.append('duration', presentationReview.duration || '01:00');
  formData.append('eye_contact_percent', String(presentationReview.eyeContact ?? 0));
  formData.append('posture_score', String(presentationReview.posture ?? 0));
  formData.append('language', presentationReview.language || 'vi');

  try {
    const result = await evaluatePresentation.mutateAsync(formData);
    setEvalFeedback(result);
    // Cập nhật ngược lại các chỉ số chính xác vào review callback hoặc state
  } catch (err) {
    setEvalError(getApiError(err).message);
  }
};
```
Và trong phần hiển thị Transcript tại `GradePanel.tsx`: Ưu tiên hiển thị `evalFeedback.transcript` nếu có, kèm số từ đệm `evalFeedback.fillers_count` và tốc độ `evalFeedback.words_per_minute`.

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `cd frontend; pnpm test GradePanel.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit thay đổi Task 3**

```bash
git add frontend/src/lib/ai.ts frontend/src/components/Coach/GradePanel.tsx frontend/src/components/Coach/GradePanel.test.tsx frontend/src/pages/PresentationReviewPage.tsx
git commit -m "feat(frontend): support FormData audio upload and display multimodal AI feedback"
```

---

### Task 4: Loại Bỏ Web Speech API & Củng Cố MediaRecorder Ghi Âm Trong `PracticeLivePage`

**Files:**
- Modify: `frontend/src/pages/PracticeLivePage.tsx:30-440, 760-800, 1060-1090`

**Interfaces:**
- Consumes: `stream.getAudioTracks()`, `MediaRecorder`
- Produces: `audioBlob` dạng `audio/webm;codecs=opus`; không còn `SpeechRecognition` hay lỗi trình duyệt.

- [ ] **Step 1: Gỡ bỏ định nghĩa và logic của Web Speech API trong `PracticeLivePage.tsx`**

- Xóa `SpeechWindow`, `LocalVoiceRecognition`, `VoiceRecognitionResult`, `VoiceRecognitionEvent`.
- Xóa `recognitionRef`, `startLocalRecognition()`, `stopRecognition()`, `speechError`, `setSpeechError`.
- Xóa `countFillers` (vì AI sẽ đếm chính xác từ audio).

- [ ] **Step 2: Đảm bảo `MediaRecorder` thu âm liên tục và kết xuất `Blob` chuẩn**

Tại `recorder.onstop` và `openAIGReview`:
```ts
recorder.onstop = () => {
  const recording = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
  if (recording.size > 0) {
    recordingBlobRef.current = recording;
    const objectUrl = URL.createObjectURL(recording);
    recordingUrlRef.current = objectUrl;
    setRecordingUrl(objectUrl);
  }
};
```
Khi mở trang review `openAIGReview()`:
```ts
const openAIGReview = () => {
  const finalAudioBlob = recordingBlobRef.current || new Blob(chunksRef.current, { type: 'audio/webm' });
  navigate('/practice/review', {
    state: {
      presentationReview: {
        audioBlob: finalAudioBlob,
        slideContent: practice?.slideContent || slideContent,
        duration: clockLabel(seconds),
        eyeContact,
        posture,
        confidence,
        fileName,
        language: practice?.language || 'vi',
        wordsPerMinute: 0, // AI sẽ tính toán
        fillers: 0,        // AI sẽ tính toán
        transcript: '',    // AI sẽ xuất transcript
      },
    },
  });
};
```

- [ ] **Step 3: Chạy typecheck xác nhận không còn lỗi TypeScript**

Run: `cd frontend; pnpm typecheck`  
Expected: PASS typecheck.

- [ ] **Step 4: Commit thay đổi Task 4**

```bash
git add frontend/src/pages/PracticeLivePage.tsx
git commit -m "refactor(practice): remove Web Speech API and streamline background audio recording"
```

---

### Task 5: Thiết Kế Lại Bảng Bên Phải: Tab "Ghi Chú" Trích Xuất PDF & Tab "AI Nhận Xét"

**Files:**
- Modify: `frontend/src/pages/PracticeLivePage.tsx:1450-1620`
- Modify: `frontend/src/pages/PracticeLivePage.test.tsx:1-150`

**Interfaces:**
- Consumes: `pdfDocument`, `slideNumber`, `extractSlideText`
- Produces: Tab 1 "Ghi chú" (hiển thị văn bản slide hiện tại, nút bút chì edit, bộ nút cỡ chữ `[-] aA [+]`), Tab 2 "AI nhận xét".

- [ ] **Step 1: Viết test cho Bảng Ghi chú mới trong `PracticeLivePage.test.tsx`**

Cập nhật `frontend/src/pages/PracticeLivePage.test.tsx`:
```tsx
it('renders Ghi chú tab with slide extracted text, font controls, and edit button', async () => {
  const dummyFile = new File(['dummy content'], 'presentation.pdf', { type: 'application/pdf' });
  render(<PracticeLivePage />, {
    wrapper: createWrapper({
      practice: {
        file: dummyFile,
        slideContent: '[Slide 1]:\nĐội ngũ phát triển Nhóm NovaByte Thanh Sơn Minh Nhật Nguyễn Mạnh Thu Trang\n\n[Slide 2]:\nMục tiêu dự án',
        autoStart: false,
      },
    }),
  });

  // Kiểm tra tên tab mới
  expect(screen.getByRole('tab', { name: /ghi chú/i })).toBeTruthy();
  expect(screen.getByRole('tab', { name: /ai nhận xét/i })).toBeTruthy();

  // Kiểm tra nội dung text slide hiển thị trong tab Ghi chú
  expect(screen.getByText(/Đội ngũ phát triển Nhóm NovaByte/i)).toBeTruthy();

  // Kiểm tra các nút điều khiển cỡ chữ và nút bút chì edit
  expect(screen.getByRole('button', { name: /giảm kích thước chữ/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /tăng kích thước chữ/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /chỉnh sửa ghi chú/i })).toBeTruthy();

  // Bấm nút bút chì chuyển sang chế độ chỉnh sửa
  fireEvent.click(screen.getByRole('button', { name: /chỉnh sửa ghi chú/i }));
  const textarea = screen.getByRole('textbox', { name: /nội dung ghi chú slide/i });
  expect(textarea).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `cd frontend; pnpm test PracticeLivePage.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Triển khai giao diện Tab Ghi chú theo đúng hình ảnh trong `PracticeLivePage.tsx`**

1. Khai báo state lưu trữ ghi chú theo từng trang:
```tsx
const [slideNotes, setSlideNotes] = useState<Record<number, string>>({});
const [isEditingNote, setIsEditingNote] = useState(false);
const [noteFontSize, setNoteFontSize] = useState(16);
```
2. Phân tách văn bản slide thành map theo từng trang từ `slideContent`:
```tsx
useEffect(() => {
  if (!slideContent) return;
  const pages = slideContent.split(/\[Slide \d+\]:\s*/);
  const notesMap: Record<number, string> = {};
  pages.forEach((pageText, idx) => {
    if (idx > 0 && pageText.trim()) {
      notesMap[idx] = pageText.trim();
    }
  });
  setSlideNotes((prev) => ({ ...notesMap, ...prev }));
}, [slideContent]);

const currentSlideText = slideNotes[slideNumber] || 'Trang này không có văn bản ghi chú';
```
3. Render Tab List:
```tsx
<div role="tablist" aria-label="Bảng hỗ trợ trình bày" className="grid grid-cols-2 border-b border-slate-200 px-4">
  <button
    type="button"
    role="tab"
    aria-selected={workspaceTab === 'notes'}
    onClick={() => setWorkspaceTab('notes')}
    className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition cursor-pointer ${
      workspaceTab === 'notes'
        ? 'border-blue-600 text-blue-700'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    <Icon name="edit_note" className="text-xl" />
    Ghi chú
  </button>
  <button
    type="button"
    role="tab"
    aria-selected={workspaceTab === 'live'}
    onClick={() => setWorkspaceTab('live')}
    className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition cursor-pointer ${
      workspaceTab === 'live'
        ? 'border-blue-600 text-blue-700'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    <Icon name="smart_toy" className="text-xl" />
    AI nhận xét
  </button>
</div>
```
4. Render Tab Panel `Ghi chú`:
```tsx
{workspaceTab === 'notes' && (
  <div role="tabpanel" aria-label="Ghi chú slide" className="relative flex min-h-0 flex-1 flex-col select-text bg-white">
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
      {isEditingNote ? (
        <textarea
          aria-label="Nội dung ghi chú slide"
          value={currentSlideText}
          onChange={(e) => setSlideNotes((prev) => ({ ...prev, [slideNumber]: e.target.value }))}
          className="w-full h-full min-h-[300px] p-3 text-slate-800 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
          style={{ fontSize: `${noteFontSize}px`, lineHeight: 1.7 }}
        />
      ) : (
        <div
          className="whitespace-pre-wrap leading-relaxed text-slate-800 font-sans select-text"
          style={{ fontSize: `${noteFontSize}px`, lineHeight: 1.75 }}
        >
          {currentSlideText}
        </div>
      )}
    </div>

    {/* Thanh công cụ nổi: chỉnh cỡ chữ & nút bút chì sửa ghi chú */}
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-between px-4 sm:px-5">
      <div className="pointer-events-auto flex items-center overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setNoteFontSize((cur) => Math.max(14, cur - 2))}
          disabled={noteFontSize <= 14}
          title="Giảm kích thước chữ"
          aria-label="Giảm kích thước chữ"
          className="flex h-10 w-10 items-center justify-center text-blue-950 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
        >
          <Icon name="remove" className="text-lg" />
        </button>
        <button
          type="button"
          onClick={() => setNoteFontSize(16)}
          title="Đặt lại kích thước chữ"
          aria-label="Đặt lại kích thước chữ"
          className="flex h-10 min-w-11 items-center justify-center border-x border-slate-200/80 px-2 text-xs font-semibold text-blue-950 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
        >
          aA
        </button>
        <button
          type="button"
          onClick={() => setNoteFontSize((cur) => Math.min(24, cur + 2))}
          disabled={noteFontSize >= 24}
          title="Tăng kích thước chữ"
          aria-label="Tăng kích thước chữ"
          className="flex h-10 w-10 items-center justify-center text-blue-950 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
        >
          <Icon name="add" className="text-lg" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsEditingNote((prev) => !prev)}
        title={isEditingNote ? 'Lưu ghi chú' : 'Chỉnh sửa ghi chú'}
        aria-label="Chỉnh sửa ghi chú"
        className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg shadow-slate-900/10 backdrop-blur-md cursor-pointer transition-all ${
          isEditingNote
            ? 'border-blue-600 bg-blue-600 text-white shadow-blue-500/20'
            : 'border-slate-200/90 bg-white/95 text-blue-950 hover:bg-blue-50 hover:text-blue-700'
        }`}
      >
        <Icon name={isEditingNote ? 'check' : 'edit'} className="text-lg" />
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `cd frontend; pnpm test PracticeLivePage.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit thay đổi Task 5**

```bash
git add frontend/src/pages/PracticeLivePage.tsx frontend/src/pages/PracticeLivePage.test.tsx
git commit -m "feat(frontend): implement slide notes tab with font size controls and pencil edit mode"
```

---

### Task 6: Kiểm Thử Toàn Diện & Build Verification

**Files:**
- Toàn bộ các files đã cập nhật trong backend và frontend

- [ ] **Step 1: Chạy toàn bộ test suite của backend**

Run: `cd backend; php artisan test --filter=Presentation`  
Expected: Tất cả 4/4 test cases đều màu xanh PASS.

- [ ] **Step 2: Chạy kiểm tra kiểu dữ liệu (TypeScript) trong frontend**

Run: `cd frontend; pnpm typecheck`  
Expected: Không có bất kỳ lỗi type nào (`Found 0 errors`).

- [ ] **Step 3: Chạy toàn bộ test suite của frontend**

Run: `cd frontend; pnpm test PracticeLivePage.test.tsx GradePanel.test.tsx`  
Expected: Tất cả các bài test đều PASS.

- [ ] **Step 4: Chạy build production frontend**

Run: `cd frontend; pnpm build`  
Expected: Build thành công không có lỗi.

- [ ] **Step 5: Commit tổng kết tính năng**

```bash
git commit --allow-empty -m "chore: verify multimodal audio evaluation and notes tab build suite"
```
