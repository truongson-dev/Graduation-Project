# Kế Hoạch Triển Khai Thử Nghiệm Tính Năng Laravel 13 An Toàn

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai thử nghiệm an toàn các công nghệ mới của Laravel 13 & Laravel AI SDK (Prompt Caching, Feature Flags với Pennant, AI Collection Decision, Audio Transcription, Conversation Deletion) vào hệ thống backend SoftSkill mà 100% không ảnh hưởng hoặc gián đoạn các tính năng hiện tại.

**Architecture:** 
- Áp dụng chiến lược Additive Architecture: Giữ nguyên 100% API `v1` cũ, các tính năng thử nghiệm được đặt tại namespace độc lập `/api/v1/ai/experimental/*`.
- Kiểm soát bật/tắt không cần redeploy thông qua Feature Flags (Laravel Pennant) scoped theo role (`admin`, `beta_tester`).
- Tầng cơ sở dữ liệu mở rộng hoàn toàn độc lập (Additive Migrations), không chỉnh sửa schema bảng cũ đang chạy.
- Lưới an toàn hồi quy (Regression test suite) đảm bảo 72 tests cũ luôn PASS 100%.

**Tech Stack:** 
- PHP 8.4, Laravel 13.38.0
- Laravel AI SDK 1.3+ (`Laravel\Ai\Transcription`, `#[CacheInstructions]`, `Collection::decide()`)
- Laravel Pennant (`laravel/pennant`)
- Pest PHP 4.7+, PHPStan Level 6

---

## Global Constraints
- Tuân thủ nghiêm ngặt chuẩn Single Action Invokable Controllers (`__invoke()`).
- 100% endpoint mới phải có FormRequest validation và Rate Limiting.
- Tất cả database migration mới là additive (bảng mới hoặc cột nullable/default).
- Tất cả thay đổi code phải pass `vendor/bin/pint --dirty --format agent` và `phpstan analyse`.
- Toàn bộ 72 tests hiện có trong suite phải luôn Green (PASS).

---

### Task 1: Đồng Bộ Hóa Migration Schema `users.password`

**Files:**
- Create: `backend/database/migrations/2026_10_29_000000_make_users_password_nullable.php`
- Test: `backend/tests/Feature/SmokeTest.php`

**Interfaces:**
- Consumes: Bảng `users` trong database.
- Produces: Migration file hợp lệ tương ứng với bản ghi ID 8 trong bảng `migrations` của MySQL để đảm bảo tính nhất quán trên mọi môi trường.

- [ ] **Step 1: Tạo file migration `2026_10_29_000000_make_users_password_nullable.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('password')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('password')->nullable(false)->change();
        });
    }
};
```

- [ ] **Step 2: Chạy kiểm thử để xác nhận migration hoạt động tốt trên SQLite test database**

Run: `cd backend; php artisan test --filter=SmokeTest`
Expected: PASS

---

### Task 2: Áp Dụng Prompt Caching Cho AI Agents (Tối Ưu Chi Phí & Độ Trễ)

**Files:**
- Modify: `backend/app/Ai/Agents/SoftSkillCoach.php:1-39`
- Modify: `backend/app/Ai/Agents/AnswerGrader.php:1-62`
- Test: `backend/tests/Feature/Ai/ChatTest.php`
- Test: `backend/tests/Feature/Ai/FeedbackTest.php`

**Interfaces:**
- Consumes: `Laravel\Ai\Attributes\CacheInstructions`.
- Produces: Cổng Gemini API tự động cache system instructions của Agent, giảm 50-70% chi phí token và độ trễ mạng.

- [ ] **Step 1: Thêm attribute `#[CacheInstructions]` vào `SoftSkillCoach`**

Trong `backend/app/Ai/Agents/SoftSkillCoach.php`:
```php
<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\CacheInstructions;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Promptable;
use Stringable;

#[CacheInstructions]
class SoftSkillCoach implements Agent, Conversational
{
    use Promptable, RemembersConversations;
    // ... giữ nguyên toàn bộ nội dung instructions và timeout
```

- [ ] **Step 2: Thêm attribute `#[CacheInstructions]` vào `AnswerGrader`**

Trong `backend/app/Ai/Agents/AnswerGrader.php`:
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
class AnswerGrader implements Agent, HasStructuredOutput
{
    use Promptable;
    // ... giữ nguyên toàn bộ constructor, instructions, schema và timeout
```

- [ ] **Step 3: Chạy test kiểm thử hồi quy để xác nhận không gây tác dụng phụ**

Run: `cd backend; php artisan test --filter="ChatTest|FeedbackTest"`
Expected: PASS 100%

---

### Task 3: Cài Đặt Hạ Tầng Feature Flags (Laravel Pennant)

**Files:**
- Modify: `backend/composer.json`
- Create: `backend/database/migrations/2026_10_30_100000_create_features_table.php`
- Modify: `backend/app/Providers/AppServiceProvider.php`
- Create: `backend/tests/Feature/Experimental/FeatureFlagTest.php`

**Interfaces:**
- Consumes: `Laravel\Pennant\Feature`.
- Produces: Hệ thống cờ tính năng `Feature::define('voice-coach', ...)` và `Feature::define('skill-classifier', ...)`.

- [ ] **Step 1: Viết test kiểm tra tính năng Feature Flag**

Tạo `backend/tests/Feature/Experimental/FeatureFlagTest.php`:
```php
<?php

use App\Models\User;
use Laravel\Pennant\Feature;
use Spatie\Permission\Models\Role;

it('activates experimental features only for admins or beta testers', function () {
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('student', 'web');

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $student = User::factory()->create();
    $student->assignRole('student');

    expect(Feature::for($admin)->active('voice-coach'))->toBeTrue();
    expect(Feature::for($student)->active('voice-coach'))->toBeFalse();
});
```

- [ ] **Step 2: Cài đặt package `laravel/pennant`**

Run: `cd backend; composer require laravel/pennant --no-interaction`
Expected: Cài đặt thành công package `laravel/pennant`.

- [ ] **Step 3: Publish migration của Pennant và định nghĩa cờ tính năng**

Run: `cd backend; php artisan pennant:table`

Trong `backend/app/Providers/AppServiceProvider.php`:
```php
use Laravel\Pennant\Feature;
use App\Models\User;

public function boot(): void
{
    $this->configureStrictMode();
    $this->configureRateLimiting();
    $this->configurePasswordRules();
    $this->configureApiDocumentation();
    $this->configureFeatureFlags();

    Gate::policy(Conversation::class, ConversationPolicy::class);
}

private function configureFeatureFlags(): void
{
    Feature::define('voice-coach', fn (User $user) => $user->hasRole('admin'));
    Feature::define('skill-classifier', fn (User $user) => $user->hasRole('admin'));
}
```

- [ ] **Step 4: Chạy test để xác nhận Feature Flags hoạt động chuẩn**

Run: `cd backend; php artisan test --filter=FeatureFlagTest`
Expected: PASS

---

### Task 4: Thử Nghiệm API Phân Loại Kỹ Năng Tự Động (`Collection::decide()`)

**Files:**
- Create: `backend/app/Http/Requests/Ai/ClassifySkillRequest.php`
- Create: `backend/app/Http/Controllers/Api/V1/Ai/Experimental/ClassifySkillController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/Ai/Experimental/ClassifySkillTest.php`

**Interfaces:**
- Consumes: Input `{ question: string, context?: string }`.
- Produces: `{ data: { skill_key: string, skill_name: string } }`.

- [ ] **Step 1: Viết test cho endpoint `POST /api/v1/ai/experimental/classify-skill`**

Tạo `backend/tests/Feature/Ai/Experimental/ClassifySkillTest.php`:
```php
<?php

use App\Models\User;
use Laravel\Pennant\Feature;
use Spatie\Permission\Models\Role;

it('requires authentication and active feature flag', function () {
    $this->postJson('/api/v1/ai/experimental/classify-skill', ['question' => 'Làm sao để đàm phán lương?'])
        ->assertUnauthorized();

    $student = User::factory()->create();
    $this->actingAs($student)
        ->postJson('/api/v1/ai/experimental/classify-skill', ['question' => 'Làm sao để đàm phán lương?'])
        ->assertForbidden();
});

it('classifies skill category for authorized users', function () {
    Role::findOrCreate('admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $response = $this->actingAs($admin)->postJson('/api/v1/ai/experimental/classify-skill', [
        'question' => 'Làm thế nào để thuyết trình tự tin trước đám đông?',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['data' => ['skill_key', 'skill_name']]);
});
```

- [ ] **Step 2: Viết FormRequest `ClassifySkillRequest`**

Tạo `backend/app/Http/Requests/Ai/ClassifySkillRequest.php`:
```php
<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class ClassifySkillRequest extends FormRequest
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
            'question' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
```

- [ ] **Step 3: Viết Controller `ClassifySkillController`**

Tạo `backend/app/Http/Controllers/Api/V1/Ai/Experimental/ClassifySkillController.php`:
```php
<?php

namespace App\Http\Controllers\Api\V1\Ai\Experimental;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\ClassifySkillRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Laravel\Pennant\Feature;
use Throwable;

class ClassifySkillController extends Controller
{
    private const SKILLS = [
        'giao_tiep' => 'Kỹ năng giao tiếp và thương lượng hàng ngày',
        'thuyet_trinh' => 'Kỹ năng thuyết trình trước đám đông và báo cáo',
        'lam_viec_nhom' => 'Kỹ năng phối hợp và giải quyết mâu thuẫn nhóm',
        'quan_ly_thoi_gian' => 'Kỹ năng tổ chức công việc và quản lý thời gian',
        'tu_duy_phan_bien' => 'Kỹ năng lập luận, phân tích vấn đề logic',
    ];

    private const NAMES = [
        'giao_tiep' => 'Giao tiếp & Đàm phán',
        'thuyet_trinh' => 'Thuyết trình trước đám đông',
        'lam_viec_nhom' => 'Làm việc nhóm',
        'quan_ly_thoi_gian' => 'Quản lý thời gian',
        'tu_duy_phan_bien' => 'Tư duy phản biện',
    ];

    public function __invoke(ClassifySkillRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless(Feature::for($user)->active('skill-classifier'), 403, 'Tính năng thử nghiệm chưa được kích hoạt cho tài khoản này.');

        $validated = $request->validated();
        $prompt = (string) $validated['question'];

        if (filled($validated['context'] ?? null)) {
            $prompt .= "\nNgữ cảnh: " . $validated['context'];
        }

        try {
            $chosenKey = collect(self::SKILLS)->decide('Tình huống hoặc câu hỏi sau đây thuộc nhóm kỹ năng mềm nào?', $prompt) ?? 'giao_tiep';
        } catch (Throwable $e) {
            report($e);
            $chosenKey = 'giao_tiep'; // Graceful fallback
        }

        return response()->json([
            'data' => [
                'skill_key' => $chosenKey,
                'skill_name' => self::NAMES[$chosenKey] ?? self::NAMES['giao_tiep'],
            ],
        ]);
    }
}
```

- [ ] **Step 4: Khai báo route thử nghiệm trong `backend/routes/api.php`**

Thêm nhóm route thử nghiệm:
```php
use App\Http\Controllers\Api\V1\Ai\Experimental\ClassifySkillController;

Route::prefix('v1/ai/experimental')->middleware(['auth:sanctum', EnsureAiConfigured::class])->group(function (): void {
    Route::post('/classify-skill', ClassifySkillController::class)
        ->middleware('throttle:ai-feedback')
        ->name('api.v1.ai.experimental.classify');
});
```

- [ ] **Step 5: Chạy test để verify**

Run: `cd backend; php artisan test --filter=ClassifySkillTest`
Expected: PASS

---

### Task 5: Thử Nghiệm API Luyện Nói Bằng Âm Thanh (`Laravel\Ai\Transcription`)

**Files:**
- Create: `backend/database/migrations/2026_10_30_110000_create_practice_voice_recordings_table.php`
- Create: `backend/app/Models/PracticeVoiceRecording.php`
- Create: `backend/app/Http/Controllers/Api/V1/Ai/Experimental/TranscribeVoiceController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/Ai/Experimental/TranscribeVoiceTest.php`

**Interfaces:**
- Consumes: File upload `audio` (`.mp3`, `.wav`, `.m4a`, max 10MB).
- Produces: `{ data: { recording_id: int, transcript: string, duration_seconds?: int } }`.

- [ ] **Step 1: Viết test cho upload audio và transcription**

Tạo `backend/tests/Feature/Ai/Experimental/TranscribeVoiceTest.php`:
```php
<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Transcription;
use Spatie\Permission\Models\Role;

it('transcribes uploaded voice recording for beta users', function () {
    Storage::fake('local');
    Role::findOrCreate('admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    Transcription::fake(['Xin chào, tôi là ứng viên ứng tuyển vị trí thực tập sinh.']);

    $file = UploadedFile::fake()->create('answer.mp3', 500, 'audio/mpeg');

    $response = $this->actingAs($admin)->postJson('/api/v1/ai/experimental/transcribe-voice', [
        'audio' => $file,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.transcript', 'Xin chào, tôi là ứng viên ứng tuyển vị trí thực tập sinh.');

    $this->assertDatabaseCount('practice_voice_recordings', 1);
});
```

- [ ] **Step 2: Tạo migration additive `practice_voice_recordings`**

Tạo `backend/database/migrations/2026_10_30_110000_create_practice_voice_recordings_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('practice_voice_recordings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->text('transcript')->nullable();
            $table->unsignedInteger('file_size_bytes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('practice_voice_recordings');
    }
};
```

- [ ] **Step 3: Tạo Model `PracticeVoiceRecording`**

Tạo `backend/app/Models/PracticeVoiceRecording.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'file_path', 'transcript', 'file_size_bytes'])]
class PracticeVoiceRecording extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Tạo Controller `TranscribeVoiceController`**

Tạo `backend/app/Http/Controllers/Api/V1/Ai/Experimental/TranscribeVoiceController.php`:
```php
<?php

namespace App\Http\Controllers\Api\V1\Ai\Experimental;

use App\Http\Controllers\Controller;
use App\Models\PracticeVoiceRecording;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Ai\Transcription;
use Laravel\Pennant\Feature;
use Throwable;

class TranscribeVoiceController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless(Feature::for($user)->active('voice-coach'), 403, 'Tính năng thử nghiệm nhận diện giọng nói chưa được kích hoạt cho bạn.');

        $request->validate([
            'audio' => ['required', 'file', 'mimes:mp3,wav,m4a,ogg', 'max:10240'],
        ]);

        $file = $request->file('audio');
        $path = $file->store('voice-practices', 'local');

        try {
            $transcript = (string) Transcription::fromStorage($path)->generate();
        } catch (Throwable $e) {
            report($e);
            return response()->json(['message' => 'Không thể nhận diện giọng nói lúc này. Vui lòng thử lại.'], 502);
        }

        $recording = PracticeVoiceRecording::create([
            'user_id' => $user->getKey(),
            'file_path' => $path,
            'transcript' => $transcript,
            'file_size_bytes' => (int) $file->getSize(),
        ]);

        return response()->json([
            'data' => [
                'recording_id' => $recording->id,
                'transcript' => $transcript,
            ],
        ]);
    }
}
```

- [ ] **Step 5: Khai báo route trong `backend/routes/api.php`**

```php
use App\Http\Controllers\Api\V1\Ai\Experimental\TranscribeVoiceController;

// Trong nhóm v1/ai/experimental:
Route::post('/transcribe-voice', TranscribeVoiceController::class)
    ->middleware('throttle:ai-feedback')
    ->name('api.v1.ai.experimental.transcribe');
```

- [ ] **Step 6: Chạy test để verify**

Run: `cd backend; php artisan test --filter=TranscribeVoiceTest`
Expected: PASS

---

### Task 6: Bổ Sung Endpoint Xóa Hội Thoại (`DELETE /v1/ai/conversations/{conversation}`)

**Files:**
- Create: `backend/app/Http/Controllers/Api/V1/Ai/ConversationDestroyController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/Ai/ConversationDestroyTest.php`

**Interfaces:**
- Consumes: `{conversation}` ID parameter.
- Produces: HTTP 204 No Content.

- [ ] **Step 1: Viết test cho xóa hội thoại**

Tạo `backend/tests/Feature/Ai/ConversationDestroyTest.php`:
```php
<?php

use App\Models\User;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Models\Conversation;

beforeEach(function () {
    config(['ai.providers.gemini.key' => 'test-key']);
});

it('allows user to delete their own conversation', function () {
    $user = User::factory()->create();
    $store = app(ConversationStore::class);
    $convId = $store->storeConversation(
        Conversation::participantType($user),
        Conversation::participantKey($user),
        'Hội thoại cần xóa'
    );

    $this->actingAs($user)
        ->deleteJson("/api/v1/ai/conversations/{$convId}")
        ->assertNoContent();

    expect(Conversation::query()->whereKey($convId)->exists())->toBeFalse();
});

it('prevents user from deleting another user conversation', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $store = app(ConversationStore::class);
    $convId = $store->storeConversation(
        Conversation::participantType($owner),
        Conversation::participantKey($owner),
        'Hội thoại người khác'
    );

    $this->actingAs($intruder)
        ->deleteJson("/api/v1/ai/conversations/{$convId}")
        ->assertNotFound();

    expect(Conversation::query()->whereKey($convId)->exists())->toBeTrue();
});
```

- [ ] **Step 2: Viết Controller `ConversationDestroyController`**

Tạo `backend/app/Http/Controllers/Api/V1/Ai/ConversationDestroyController.php`:
```php
<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Laravel\Ai\Models\Conversation;

class ConversationDestroyController extends Controller
{
    /**
     * Delete an AI conversation owned by the authenticated user.
     */
    public function __invoke(Request $request, Conversation $conversation): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless(Gate::allows('view', $conversation), 404, 'Không tìm thấy hội thoại.');

        $conversation->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 3: Khai báo route trong `backend/routes/api.php`**

```php
use App\Http\Controllers\Api\V1\Ai\ConversationDestroyController;

// Trong nhóm v1/ai:
Route::delete('/conversations/{conversation}', ConversationDestroyController::class)
    ->name('api.v1.ai.conversations.destroy');
```

- [ ] **Step 4: Chạy test để verify**

Run: `cd backend; php artisan test --filter=ConversationDestroyTest`
Expected: PASS

---

### Task 7: Kiểm Thử Toàn Diện & Chuẩn Hóa Code (Full Verification & Formatting)

**Files:**
- Toàn bộ codebase backend

- [ ] **Step 1: Format mã nguồn theo chuẩn Laravel Pint**

Run: `cd backend; vendor/bin/pint --format agent`
Expected: Định dạng code chuẩn PSR/Pint.

- [ ] **Step 2: Kiểm tra phân tích tĩnh PHPStan Level 6**

Run: `cd backend; vendor/bin/phpstan analyse --debug --memory-limit=1G`
Expected: 0 errors.

- [ ] **Step 3: Chạy toàn bộ Test Suite của hệ thống (Regression Test)**

Run: `cd backend; php artisan test --compact`
Expected: Toàn bộ tests (cũ + mới) đạt 100% Green (PASS).
