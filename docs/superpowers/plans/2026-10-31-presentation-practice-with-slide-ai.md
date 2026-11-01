# Kế Hoạch Triển Khai: Tính Năng Luyện Thuyết Trình Với AI Dựa Trên Slide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng AI chấm điểm bài thuyết trình theo 4 trụ cột dựa trên sự đối chiếu giữa nội dung slide đã tải lên và lời nói thực tế của sinh viên (nhận diện đọc chép, đo độ bao quát slide, đánh giá nhịp nói WPM, từ đệm và tác phong cơ thể).

**Architecture:** 
- Phía Backend: Bổ sung endpoint độc lập `POST /api/v1/ai/presentation/evaluate` kết hợp Agent chuyên biệt `PresentationEvaluator` áp dụng thuộc tính `#[CacheInstructions]` của Laravel 13 để tối ưu chi phí token Gemini và thời gian phản hồi.
- Phía Frontend: Trích xuất nội dung text từ slide (`pdfjs-dist`), kết hợp cùng dữ liệu đo lường thời gian thực (MediaPipe + Web Speech API) từ `PracticeLivePage` và gửi lên backend để hiển thị bảng báo cáo 4 trụ cột trực quan trong `GradePanel`.

**Tech Stack:** 
- Backend: PHP 8.4, Laravel 13.38.0, Laravel AI SDK 1.3+ (`#[CacheInstructions]`, `HasStructuredOutput`), Pest PHP 4.7+, PHPStan Level 6
- Frontend: React 19, TypeScript, `@tanstack/react-query`, `pdfjs-dist`, `@mediapipe/tasks-vision`, Tailwind CSS

**Spec:** [`docs/superpowers/specs/2026-10-31-presentation-practice-with-slide-ai-design.md`](file:///d:/Android-APP/softskill/docs/superpowers/specs/2026-10-31-presentation-practice-with-slide-ai-design.md)

## Global Constraints
- Tất cả API endpoints tuân theo chuẩn RESTful v1 và Single Action Invokable Controllers (`__invoke()`).
- Endpoint mới phải có FormRequest validation chặt chẽ và rate limiting (`throttle:ai-feedback`).
- Mã nguồn PHP phải tuân thủ chuẩn PSR/Laravel Pint và đạt PHPStan Level 6 (0 errors).
- Toàn bộ 72 tests hiện có của Backend và test suite Frontend phải luôn PASS 100%.

---

### Task 1: Xây Dựng Agent AI `PresentationEvaluator` Phía Backend

**Files:**
- Create: `backend/app/Ai/Agents/PresentationEvaluator.php`
- Test: `backend/tests/Feature/Ai/PresentationEvaluatorTest.php`

**Interfaces:**
- Consumes: `Laravel\Ai\Contracts\Agent`, `Laravel\Ai\Contracts\HasStructuredOutput`, `Laravel\Ai\Attributes\CacheInstructions`.
- Produces: `PresentationEvaluator` class cung cấp prompt instructions tối ưu, schema 4 trụ cột và cache instructions.

- [ ] **Step 1: Viết test cho Agent schema và instructions**

Tạo `backend/tests/Feature/Ai/PresentationEvaluatorTest.php`:
```php
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
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại vì chưa tạo class**

Run: `cd backend; php artisan test --filter=PresentationEvaluatorTest`
Expected: FAIL (Class `App\Ai\Agents\PresentationEvaluator` does not exist).

- [ ] **Step 3: Viết mã nguồn `PresentationEvaluator.php`**

Tạo `backend/app/Ai/Agents/PresentationEvaluator.php`:
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
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd backend; php artisan test --filter=PresentationEvaluatorTest`
Expected: PASS.

---

### Task 2: Xây Dựng FormRequest, Controller và Route Cho API Backend

**Files:**
- Create: `backend/app/Http/Requests/Ai/EvaluatePresentationRequest.php`
- Create: `backend/app/Http/Controllers/Api/V1/Ai/PresentationEvaluationController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/Ai/PresentationEvaluationTest.php`

**Interfaces:**
- Consumes: `EvaluatePresentationRequest` payload.
- Produces: HTTP JSON response mang cấu trúc `PresentationEvaluationFeedback`.

- [ ] **Step 1: Viết test cho endpoint `POST /api/v1/ai/presentation/evaluate`**

Tạo `backend/tests/Feature/Ai/PresentationEvaluationTest.php`:
```php
<?php

use App\Ai\Agents\PresentationEvaluator;
use App\Models\User;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
});

it('rejects unauthenticated requests', function () {
    $this->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnauthorized();
});

it('validates required fields for presentation evaluation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/ai/presentation/evaluate', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slide_content', 'transcript', 'duration', 'words_per_minute']);
});

it('evaluates presentation and returns structured 4-pillar feedback', function () {
    $user = User::factory()->create();

    PresentationEvaluator::fake([[
        'overall_score' => 88,
        'is_reading_slides' => false,
        'slide_coverage_score' => 85,
        'elaboration_quality' => 'Diễn giải rất tốt, có ví dụ thực tế.',
        'voice_feedback' => 'Tốc độ 120 từ/phút rất chuẩn, ít từ đệm.',
        'body_language_feedback' => 'Ánh mắt tự tin, dáng đứng vững vàng.',
        'strengths' => ['Bố cục rõ ràng', 'Không phụ thuộc slide'],
        'improvements' => ['Nói to hơn ở phần kết'],
        'actionable_tips' => ['Tập trung nhìn đều 3 hướng người nghe'],
    ]]);

    $response = $this->actingAs($user)->postJson('/api/v1/ai/presentation/evaluate', [
        'slide_content' => 'Slide 1: Tổng quan dự án AI. Mục tiêu hỗ trợ sinh viên.',
        'transcript' => 'Kính chào thầy cô, hôm nay em xin giới thiệu dự án AI giúp sinh viên nâng cao kỹ năng.',
        'duration' => '04:30',
        'words_per_minute' => 120,
        'fillers_count' => 3,
        'eye_contact_percent' => 82,
        'posture_score' => 88,
        'language' => 'vi',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.overall_score', 88)
        ->assertJsonPath('data.is_reading_slides', false)
        ->assertJsonPath('data.slide_coverage_score', 85)
        ->assertJsonStructure([
            'data' => [
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

- [ ] **Step 2: Tạo FormRequest `EvaluatePresentationRequest.php`**

Tạo `backend/app/Http/Requests/Ai/EvaluatePresentationRequest.php`:
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
            'slide_content' => ['required', 'string', 'max:25000'],
            'transcript' => ['required', 'string', 'max:15000'],
            'duration' => ['required', 'string', 'max:50'],
            'words_per_minute' => ['required', 'integer', 'min:0', 'max:500'],
            'fillers_count' => ['required', 'integer', 'min:0', 'max:500'],
            'eye_contact_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'posture_score' => ['required', 'integer', 'min:0', 'max:100'],
            'language' => ['nullable', 'string', 'in:vi,en'],
        ];
    }
}
```

- [ ] **Step 3: Tạo Controller `PresentationEvaluationController.php`**

Tạo `backend/app/Http/Controllers/Api/V1/Ai/PresentationEvaluationController.php`:
```php
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
```

- [ ] **Step 4: Khai báo Route trong `backend/routes/api.php`**

Trong `backend/routes/api.php`, bên trong nhóm `Route::prefix('v1/ai')`:
```php
use App\Http\Controllers\Api\V1\Ai\PresentationEvaluationController;

Route::prefix('v1/ai')->middleware(['auth:sanctum', EnsureAiConfigured::class])->group(function (): void {
    // ... các route cũ giữ nguyên ...
    Route::post('/presentation/evaluate', PresentationEvaluationController::class)
        ->middleware('throttle:ai-feedback')
        ->name('api.v1.ai.presentation.evaluate');
});
```

- [ ] **Step 5: Chạy test để xác nhận toàn bộ Backend Tests PASS**

Run: `cd backend; php artisan test --filter=PresentationEvaluationTest`
Expected: PASS (4 assertions).

- [ ] **Step 6: Chạy kiểm thử hồi quy Backend**

Run: `cd backend; php artisan test --compact`
Expected: 74/74 tests PASS (bao gồm 72 test cũ + 2 test mới).

---

### Task 3: Bổ Sung API Client & Hàm Trích Xuất Text Slide Phía Frontend

**Files:**
- Create: `frontend/src/lib/slide.ts`
- Modify: `frontend/src/lib/ai.ts`
- Test: `frontend/src/lib/slide.test.ts`

**Interfaces:**
- Consumes: File PDF từ người dùng.
- Produces: `extractSlideText(file: File): Promise<string>` và hook `useEvaluatePresentation()`.

- [ ] **Step 1: Viết test cho hàm trích xuất text slide `extractSlideText`**

Tạo `frontend/src/lib/slide.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractSlideText } from './slide';

describe('slide text extraction', () => {
  it('returns a fallback message when file is missing or invalid', async () => {
    const text = await extractSlideText(null as unknown as File);
    expect(text).toBe('');
  });
});
```

- [ ] **Step 2: Viết utility `frontend/src/lib/slide.ts`**

Tạo `frontend/src/lib/slide.ts`:
```ts
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/**
 * Extract plain text content from each slide of a PDF document.
 */
export async function extractSlideText(file: File | null | undefined): Promise<string> {
  if (!file) return '';

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return `[Tài liệu trình chiếu: ${file.name}]`;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((str) => str.trim().length > 0);

      if (pageStrings.length > 0) {
        pagesText.push(`[Slide ${pageNum}]: ${pageStrings.join(' ')}`);
      }
    }

    return pagesText.join('\n\n');
  } catch (error) {
    console.warn('Could not extract PDF text:', error);
    return `[Tài liệu: ${file.name}]`;
  }
}
```

- [ ] **Step 3: Bổ sung API Types và Mutation Hook vào `frontend/src/lib/ai.ts`**

Trong `frontend/src/lib/ai.ts`, thêm interface và mutation hook:
```ts
export interface PresentationEvaluationPayload {
  slide_content: string;
  transcript: string;
  duration: string;
  words_per_minute: number;
  fillers_count: number;
  eye_contact_percent: number;
  posture_score: number;
  language?: 'vi' | 'en';
}

export interface PresentationEvaluationFeedback {
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
  return useMutation<PresentationEvaluationFeedback, Error, PresentationEvaluationPayload>({
    mutationFn: async (payload) => {
      const response = await api.post<{ data: PresentationEvaluationFeedback }>(
        '/v1/ai/presentation/evaluate',
        payload,
      );
      return response.data.data;
    },
  });
}
```

- [ ] **Step 4: Chạy test frontend để verify**

Run: `cd frontend; npm test -- src/lib/slide.test.ts`
Expected: PASS.

---

### Task 4: Tích Hợp Trích Xuất Slide Vào `PracticeSetupPage` và `PracticeLivePage`

**Files:**
- Modify: `frontend/src/pages/PracticeSetupPage.tsx`
- Modify: `frontend/src/pages/PracticeLivePage.tsx`

**Interfaces:**
- Consumes: File slide do sinh viên kéo thả/chọn.
- Produces: `slideContent` truyền trong router state từ Setup ➔ Live ➔ Review.

- [ ] **Step 1: Cập nhật `PracticeSetupPage.tsx`**

Nhập `extractSlideText` từ `../lib/slide` và gọi trích xuất khi người dùng chọn file:
```ts
import { extractSlideText } from '../lib/slide';

// Trong component:
const [slideContent, setSlideContent] = useState('');

const handleFileSelect = async (selectedFile: File) => {
  // logic setFile hiện tại...
  const extracted = await extractSlideText(selectedFile);
  setSlideContent(extracted);
};
```
Khi bấm "Bắt đầu luyện tập" (`navigate('/practice/live', ...)`), truyền thêm `slideContent`:
```ts
navigate('/practice/live', {
  state: {
    practice: {
      file: file.file,
      slideContent,
      duration,
      criteria,
      language,
    },
  },
});
```

- [ ] **Step 2: Cập nhật `PracticeLivePage.tsx`**

Trong kiểu `LivePageState`, cập nhật:
```ts
type LivePageState = {
  practice?: {
    file?: File;
    slideContent?: string;
    duration?: number;
    criteria?: string[];
    language?: 'vi' | 'en';
    autoStart?: boolean;
  };
};
```
Khi kết thúc phiên thuyết trình và điều hướng tới `/practice/review`, truyền kèm `slideContent`:
```ts
navigate('/practice/review', {
  state: {
    presentationReview: {
      slideContent: practice?.slideContent ?? '',
      transcript: transcriptRef.current,
      duration: clockLabel(elapsedSeconds),
      wordsPerMinute: currentWpm,
      fillers: currentFillers,
      eyeContact: Math.round(averageEyeContact),
      posture: Math.round(averagePosture),
      confidence: estimatedConfidence,
      fileName: file?.name ?? 'Bài thuyết trình',
    },
  },
});
```

---

### Task 5: Nâng Cấp Giao Diện Báo Cáo 4 Trụ Cột Trong `GradePanel.tsx`

**Files:**
- Modify: `frontend/src/components/Coach/GradePanel.tsx`
- Modify: `frontend/src/pages/PresentationReviewPage.tsx`

**Interfaces:**
- Consumes: `presentationReview` (chứa `slideContent`, `transcript`, metrics) và gọi `useEvaluatePresentation()`.
- Produces: Giao diện kết quả chuyên nghiệp hiển thị 4 trụ cột, cảnh báo đọc chép, điểm số, điểm mạnh/yếu và mẹo hành động.

- [ ] **Step 1: Cập nhật interface `PresentationReview` trong `GradePanel.tsx`**

```ts
interface PresentationReview {
  slideContent?: string;
  transcript: string;
  duration: string;
  wordsPerMinute: number;
  fillers: number;
  eyeContact: number;
  posture: number;
  confidence: number | null;
  fileName: string;
}
```

- [ ] **Step 2: Tích hợp hook `useEvaluatePresentation` và render kết quả 4 trụ cột**

Trong `GradePanel.tsx`:
- Sử dụng `useEvaluatePresentation()` khi `presentationReview` có dữ liệu.
- Tự động gọi API đánh giá khi vào trang (hoặc có nút "Yêu cầu AI phân tích lại").
- Render giao diện trực quan:
  1. **Thẻ Điểm Tổng Quát (Overall Score)** với vòng tròn màu sắc và nhãn xếp loại.
  2. **Banner Đọc Chép (Reading vs Elaboration)**:
     - Nếu `feedback.is_reading_slides === true`: Màu vàng cam nổi bật cảnh báo đang đọc chữ trên slide.
     - Nếu `false`: Màu xanh lá biểu dương phong thái tự tin, diễn giải mạch lạc.
  3. **Lưới 4 Trụ Cột Đánh Giá (4 Pillars Grid)**:
     - Card 1: Độ bao quát Slide (`slide_coverage_score` %).
     - Card 2: Chất lượng diễn giải (`elaboration_quality`).
     - Card 3: Nhịp nói & Từ đệm (`voice_feedback`, WPM).
     - Card 4: Ngôn ngữ cơ thể (`body_language_feedback`, Eye Contact, Posture).
  4. **Điểm mạnh & Điểm cần cải thiện** dạng cards có icon.
  5. **Mẹo hành động cụ thể (Actionable Tips)**: 2 lời khuyên có thể áp dụng ngay ở lượt nói tới.

---

### Task 6: Kiểm Thử Toàn Diện, Chuẩn Hóa Mã Nguồn & Build Verify

**Files:**
- Toàn bộ codebase

- [ ] **Step 1: Format mã nguồn PHP Backend với Pint**

Run: `cd backend; vendor/bin/pint --format agent`
Expected: 0 format issues.

- [ ] **Step 2: Kiểm tra phân tích tĩnh PHPStan Level 6**

Run: `cd backend; vendor/bin/phpstan analyse --debug --memory-limit=1G`
Expected: [OK] No errors.

- [ ] **Step 3: Chạy toàn bộ Test Suite Backend**

Run: `cd backend; php artisan test --compact`
Expected: 100% tests PASS.

- [ ] **Step 4: Kiểm tra TypeScript và Build Frontend**

Run: `cd frontend; npm run build`
Expected: Build thành công (0 TypeScript errors, bundle sinh ra trong `dist/`).
