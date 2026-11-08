# Kế Hoạch Triển Khai: Chức Năng Lộ Trình Học & Gamification (Full-Stack)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống lộ trình học kỹ năng mềm full-stack (kiểu Duolingo roadmap) gồm 3 loại bài học (lý thuyết, trắc nghiệm, bài tập viết chấm qua AI AnswerGrader) kết hợp lưu trữ tiến trình học tập và gamification (XP, streak, lives, giải đấu) từ Backend Laravel API thay thế hoàn toàn dữ liệu giả/localStorage hiện tại.

**Architecture:** 
- **Backend (Laravel 13):** Lưu trữ 8 bảng cơ sở dữ liệu (`learning_paths`, `sections`, `lessons`, `user_lesson_progress`, `user_lesson_attempts`, `user_gamification`, `user_daily_streaks`). Các services chuyên biệt (`ProgressService`, `GamificationService`, `LessonAttemptService`) quản lý mở khóa bài học tuyến tính, cộng XP, tính streak ngày, và chấm điểm bài viết tái sử dụng agent `App\Ai\Agents\AnswerGrader` (Laravel AI SDK).
- **Frontend (React 19 + TanStack Query):** Thay thế dữ liệu hardcode trong `LearningPathPage.tsx` bằng custom React Query hooks (`useLearningPath`, `useGamification`); bổ sung trang học bài `LessonPage.tsx` và trang kết quả `LessonResultPage.tsx` linh hoạt hiển thị theo 3 loại bài học (Theory, Quiz, Writing).

**Tech Stack:** Laravel 13, SQLite, `laravel/ai` (Gemini Driver), Pest PHP, React 19, TypeScript, Tailwind CSS v4, TanStack React Query, Axios, Lucide React, Material Symbols, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-08-learning-path-design.md`](file:///d:/Android-APP/softskill/docs/superpowers/specs/2026-11-08-learning-path-design.md)

## Global Constraints

- **AI Dependency:** Tuyệt đối không chặn các route bài học lý thuyết hoặc quiz bằng middleware AI. Chỉ kiểm tra cấu hình AI khi nộp bài viết (`writing`). Nếu AI chưa cấu hình thì trả về HTTP 503 cho riêng bài viết.
- **Tái sử dụng AI Agent:** Sử dụng trực tiếp `App\Ai\Agents\AnswerGrader` và `App\Data\Ai\AnswerFeedbackData`, không viết thêm client Gemini thủ công.
- **Mở khóa tuyến tính:** Bài học $N+1$ chỉ mở khóa khi bài học $N$ đạt trạng thái `passed` (điểm $\ge$ `pass_threshold`). Bài lý thuyết luôn đạt 100 điểm ngay khi bấm hoàn thành.
- **Gamification:** Mạng sống (Lives) tối đa là 5; khi về 0 sẽ có thời gian hồi phục 24 giờ. Streak tính theo chuỗi ngày liên tiếp có hoạt động hoàn thành bài học.
- **TDD:** Viết test trước hoặc song song để đảm bảo tính ổn định và hồi quy.

---

### Task 1: Database Migrations & Eloquent Models

**Files:**
- Create: `backend/database/migrations/2026_11_08_000001_create_learning_paths_table.php`
- Create: `backend/database/migrations/2026_11_08_000002_create_sections_table.php`
- Create: `backend/database/migrations/2026_11_08_000003_create_lessons_table.php`
- Create: `backend/database/migrations/2026_11_08_000004_create_user_lesson_progress_table.php`
- Create: `backend/database/migrations/2026_11_08_000005_create_user_lesson_attempts_table.php`
- Create: `backend/database/migrations/2026_11_08_000006_create_user_gamification_table.php`
- Create: `backend/database/migrations/2026_11_08_000007_create_user_daily_streaks_table.php`
- Create: `backend/app/Models/LearningPath.php`
- Create: `backend/app/Models/Section.php`
- Create: `backend/app/Models/Lesson.php`
- Create: `backend/app/Models/UserLessonProgress.php`
- Create: `backend/app/Models/UserLessonAttempt.php`
- Create: `backend/app/Models/UserGamification.php`
- Create: `backend/app/Models/UserDailyStreak.php`
- Modify: `backend/app/Models/User.php:20-60`

**Interfaces:**
- `LearningPath`: `hasMany(Section::class)`
- `Section`: `belongsTo(LearningPath::class)`, `hasMany(Lesson::class)`
- `Lesson`: `belongsTo(Section::class)`, `content_json` cast as `array`
- `User`: `hasOne(UserGamification::class)`, `hasMany(UserLessonProgress::class)`, `hasMany(UserDailyStreak::class)`
- `UserLessonProgress`: `belongsTo(User::class)`, `belongsTo(Lesson::class)`
- `UserLessonAttempt`: `belongsTo(User::class)`, `belongsTo(Lesson::class)`, `answers_json` & `ai_feedback` cast as `array`

- [ ] **Step 1: Tạo các tệp migrations cho 7 bảng**

Tạo migration cho `learning_paths`:
```php
Schema::create('learning_paths', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('slug')->unique();
    $table->integer('sort_order')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

Tạo migration cho `sections`:
```php
Schema::create('sections', function (Blueprint $table) {
    $table->id();
    $table->foreignId('learning_path_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->string('subtitle')->nullable();
    $table->string('icon')->default('school');
    $table->integer('sort_order')->default(0);
    $table->timestamps();
});
```

Tạo migration cho `lessons`:
```php
Schema::create('lessons', function (Blueprint $table) {
    $table->id();
    $table->foreignId('section_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->string('type'); // theory, quiz, writing
    $table->integer('sort_order')->default(0);
    $table->json('content_json');
    $table->integer('pass_threshold')->default(70);
    $table->integer('xp_reward')->default(15);
    $table->timestamps();
});
```

Tạo migration cho `user_lesson_progress`:
```php
Schema::create('user_lesson_progress', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
    $table->string('status')->default('locked'); // locked, unlocked, in_progress, passed, failed
    $table->integer('best_score')->nullable();
    $table->integer('xp_earned')->default(0);
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();
    $table->unique(['user_id', 'lesson_id']);
});
```

Tạo migration cho `user_lesson_attempts`:
```php
Schema::create('user_lesson_attempts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
    $table->integer('attempt_number')->default(1);
    $table->json('answers_json')->nullable();
    $table->integer('score')->default(0);
    $table->json('ai_feedback')->nullable();
    $table->boolean('passed')->default(false);
    $table->timestamps();
});
```

Tạo migration cho `user_gamification`:
```php
Schema::create('user_gamification', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
    $table->integer('total_xp')->default(0);
    $table->integer('current_streak')->default(0);
    $table->integer('longest_streak')->default(0);
    $table->integer('lives_count')->default(5);
    $table->timestamp('lives_refill_at')->nullable();
    $table->string('tournament_tier')->default('Đồng');
    $table->integer('tournament_rank')->nullable();
    $table->timestamps();
});
```

Tạo migration cho `user_daily_streaks`:
```php
Schema::create('user_daily_streaks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->integer('xp_earned')->default(0);
    $table->integer('lessons_completed')->default(0);
    $table->timestamps();
    $table->unique(['user_id', 'date']);
});
```

- [ ] **Step 2: Tạo các Eloquent Models và thiết lập quan hệ**

Tạo các file Model tương ứng với cast json và fillable attributes. Cập nhật `User.php` để thêm các quan hệ:
```php
public function gamification(): HasOne
{
    return $this->hasOne(UserGamification::class);
}

public function lessonProgress(): HasMany
{
    return $this->hasMany(UserLessonProgress::class);
}

public function dailyStreaks(): HasMany
{
    return $this->hasMany(UserDailyStreak::class);
}
```

- [ ] **Step 3: Chạy migration và kiểm tra tính toàn vẹn**

Run: `cd backend; php artisan migrate`
Expected: Migration tables created successfully without errors.

- [ ] **Step 4: Commit**
```bash
git add backend/database/migrations backend/app/Models
git commit -m "feat(learning): add database migrations and models for learning path and gamification"
```

---

### Task 2: Seeder Dữ Liệu Lộ Trình Kỹ Năng Mềm

**Files:**
- Create: `backend/database/seeders/LearningPathSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php:1-25`

**Interfaces:**
- Khởi tạo 1 lộ trình: `Kỹ năng mềm` (slug: `ky-nang-mem`)
- Khởi tạo 7 Sections: Khởi động, Giao tiếp tự tin, Lắng nghe chủ động, Phản hồi tích cực, Thuyết trình cuốn hút, Phỏng vấn chuyên nghiệp, Tự tin bứt phá.
- Khởi tạo 25 Lessons chuẩn hóa với đầy đủ nội dung (Lý thuyết Markdown tiếng Việt, Quiz trắc nghiệm 4 đáp án có giải thích, Bài viết với prompt và rubric chấm điểm).

- [ ] **Step 1: Viết `LearningPathSeeder.php`**

Nội dung seed dữ liệu khớp hoàn toàn với 7 node hiện tại ở frontend. Cấu trúc bài học đa dạng:
- Bài 1 (Khởi động - Khám phá điểm mạnh): `type = 'theory'` (Markdown chi tiết)
- Bài 2 (Đặt mục tiêu rèn luyện): `type = 'quiz'` (4 câu hỏi trắc nghiệm)
- Bài 3 (Nhận diện phong cách): `type = 'writing'` (Viết đoạn văn ngắn phân tích phong cách giao tiếp)
- Tương tự cho 6 sections còn lại.

- [ ] **Step 2: Đăng ký Seeder vào `DatabaseSeeder.php` và chạy seed**

Run: `cd backend; php artisan db:seed --class=LearningPathSeeder`
Expected: `Database seeding completed successfully.`

- [ ] **Step 3: Commit**
```bash
git add backend/database/seeders
git commit -m "feat(learning): add comprehensive seeder for soft skills learning path"
```

---

### Task 3: Backend Services (Progress, Gamification, LessonAttempt)

**Files:**
- Create: `backend/app/Services/Learning/ProgressService.php`
- Create: `backend/app/Services/Learning/GamificationService.php`
- Create: `backend/app/Services/Learning/LessonAttemptService.php`

**Interfaces:**
- `ProgressService`:
  - `initializeForUser(User $user, LearningPath $path): void`
  - `getPathProgress(User $user, LearningPath $path): array`
  - `unlockNext(User $user, Lesson $completedLesson): ?Lesson`
- `GamificationService`:
  - `getGamification(User $user): UserGamification`
  - `awardXp(User $user, int $amount): void`
  - `recordActivity(User $user, int $xp): void`
  - `consumeLife(User $user): UserGamification`
  - `checkAndRefillLives(UserGamification $gamification): void`
  - `getWeeklyLeaderboard(User $user): array`
  - `getStreakData(User $user): array`
- `LessonAttemptService`:
  - `submit(User $user, Lesson $lesson, array $input): array`

- [ ] **Step 1: Viết test cho `ProgressService` & `GamificationService`**

Tạo `backend/tests/Unit/Services/LearningServiceTest.php`:
Kiểm tra:
1. Mở khóa bài học đầu tiên khi người dùng mới truy cập.
2. Mở khóa bài học tiếp theo khi bài trước đạt điểm đỗ.
3. Tiêu hao mạng (lives), không cho tiêu hao khi lives = 0.
4. Tự động phục hồi mạng khi thời gian `lives_refill_at` đã trôi qua 24h.
5. Tính toán streak liên tiếp chính xác.

- [ ] **Step 2: Hiện thực `ProgressService.php`**

Bao gồm logic tính toán phần trăm hoàn thành, trạng thái section (`complete`, `current`, `locked`), và tự động mở bài đầu tiên của section tiếp theo khi hoàn thành section trước.

- [ ] **Step 3: Hiện thực `GamificationService.php`**

Quản lý `total_xp`, chuỗi `current_streak`, `longest_streak`, cơ chế phục hồi 5 mạng sau 24h, và tổng hợp bảng xếp hạng tuần.

- [ ] **Step 4: Hiện thực `LessonAttemptService.php`**

Xử lý nộp bài:
- `theory`: Tự động cho điểm 100, pass = true.
- `quiz`: So sánh mảng câu trả lời với `content_json['questions'][*]['correct']`, tính điểm phần trăm.
- `writing`: Kiểm tra API key cấu hình AI. Nếu chưa cấu hình, throw ServiceUnavailableException (503). Nếu có cấu hình, khởi tạo `App\Ai\Agents\AnswerGrader` với `$skill`, `$question`, `$answer`, `$context`, gọi `$agent->prompt()` và trích xuất điểm số cùng feedback (`summary`, `strengths`, `improvements`).
- Lưu lịch sử `UserLessonAttempt`. Nếu pass, cập nhật `UserLessonProgress`, gọi `ProgressService::unlockNext()`, gọi `GamificationService::awardXp()` và `GamificationService::recordActivity()`.

- [ ] **Step 5: Chạy Pest test để đảm bảo các service pass 100%**

Run: `cd backend; php artisan test --filter=LearningServiceTest`
Expected: All tests pass.

- [ ] **Step 6: Commit**
```bash
git add backend/app/Services/Learning backend/tests/Unit/Services/LearningServiceTest.php
git commit -m "feat(learning): implement ProgressService, GamificationService, and LessonAttemptService"
```

---

### Task 4: Backend API Controllers, Requests & Routes

**Files:**
- Create: `backend/app/Http/Requests/Learning/SubmitAttemptRequest.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/LearningPathController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/SectionController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/LessonController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/LessonAttemptController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/ProgressController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/GamificationController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/LeaderboardController.php`
- Create: `backend/app/Http/Controllers/Api/V1/Learning/StreakController.php`
- Modify: `backend/routes/api.php:100-115`

**Interfaces:**
- Định nghĩa đầy đủ các route RESTful dưới prefix `v1/learning`, bảo vệ bởi middleware `auth:sanctum`.
- Request validation cho `POST /lessons/{id}/attempt`:
  - Nếu quiz: mảng `answers` số nguyên.
  - Nếu writing: `content` từ 50 đến 5000 ký tự.
  - Nếu theory: `completed = true`.

- [ ] **Step 1: Tạo `SubmitAttemptRequest.php` với custom validation theo `type` của Lesson**
- [ ] **Step 2: Tạo các Controller kết nối với Services đã viết ở Task 3**
- [ ] **Step 3: Đăng ký route group `v1/learning` trong `backend/routes/api.php`**
- [ ] **Step 4: Commit**
```bash
git add backend/app/Http/Controllers/Api/V1/Learning backend/app/Http/Requests/Learning backend/routes/api.php
git commit -m "feat(learning): register learning path API routes and controllers"
```

---

### Task 5: Backend Feature Tests

**Files:**
- Create: `backend/tests/Feature/Learning/LearningPathTest.php`
- Create: `backend/tests/Feature/Learning/LessonAttemptTest.php`
- Create: `backend/tests/Feature/Learning/GamificationTest.php`

**Interfaces:**
- Kiểm tra toàn bộ endpoint `GET /v1/learning/paths`, `GET /v1/learning/paths/{slug}`, `GET /v1/learning/lessons/{id}` (đảm bảo không lộ đáp án đúng quiz), `POST /v1/learning/lessons/{id}/attempt`, `POST /v1/learning/lives/consume`.

- [ ] **Step 1: Viết Feature test cho Lộ trình học (`LearningPathTest.php`)**
- [ ] **Step 2: Viết Feature test cho Nộp bài và Mở khóa (`LessonAttemptTest.php`)**
- [ ] **Step 3: Viết Feature test cho Gamification & Bảng xếp hạng (`GamificationTest.php`)**
- [ ] **Step 4: Chạy toàn bộ test suite backend**

Run: `cd backend; php artisan test --filter=Learning`
Expected: Tất cả feature tests pass.

- [ ] **Step 5: Commit**
```bash
git add backend/tests/Feature/Learning
git commit -m "test(learning): add feature tests for learning path API endpoints"
```

---

### Task 6: Frontend API Client, Endpoints & TypeScript Types

**Files:**
- Create: `frontend/src/types/learning.ts`
- Modify: `frontend/src/lib/api.ts:35-50`

**Interfaces:**
- `LearningPath`, `Section`, `Lesson`, `QuizQuestion`, `UserProgress`, `GamificationData`, `AttemptResult`, `StreakInfo` types.
- Thêm nhóm `learning` vào `endpoints` object trong `frontend/src/lib/api.ts`.

- [ ] **Step 1: Tạo `frontend/src/types/learning.ts` chứa đầy đủ interface cho dữ liệu backend**
- [ ] **Step 2: Mở rộng `endpoints.learning` trong `frontend/src/lib/api.ts`**
```typescript
learning: {
  paths: '/learning/paths',
  path: (slug: string) => `/learning/paths/${slug}`,
  section: (id: string | number) => `/learning/sections/${id}`,
  lesson: (id: string | number) => `/learning/lessons/${id}`,
  attempts: (id: string | number) => `/learning/lessons/${id}/attempts`,
  attempt: (id: string | number) => `/learning/lessons/${id}/attempt`,
  progress: '/learning/progress',
  gamification: '/learning/gamification',
  consumeLife: '/learning/lives/consume',
  leaderboard: '/learning/leaderboard',
  streak: '/learning/streak',
}
```
- [ ] **Step 3: Commit**
```bash
git add frontend/src/types/learning.ts frontend/src/lib/api.ts
git commit -m "feat(learning): declare frontend types and api endpoints for learning path"
```

---

### Task 7: Frontend React Query Hooks

**Files:**
- Create: `frontend/src/hooks/useLearningPath.ts`
- Create: `frontend/src/hooks/useLesson.ts`
- Create: `frontend/src/hooks/useLessonAttempt.ts`
- Create: `frontend/src/hooks/useGamification.ts`

**Interfaces:**
- `useLearningPath(slug)`: query lấy chi tiết lộ trình và sections
- `useLesson(lessonId)`: query lấy nội dung bài học
- `useLessonAttempt(lessonId)`: mutation nộp bài, tự động invalidate các query liên quan
- `useGamification()`: query lấy XP, streak, lives
- `useConsumeLife()`: mutation trừ mạng sống

- [ ] **Step 1: Tạo các hook với TanStack Query và Axios instance đã có sẵn**
- [ ] **Step 2: Viết test cho các hooks (`frontend/src/hooks/useLearningPath.test.ts`)**
- [ ] **Step 3: Chạy test hooks bằng Vitest**

Run: `cd frontend; npm run test -- useLearningPath`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add frontend/src/hooks
git commit -m "feat(learning): implement React Query hooks for learning path and gamification"
```

---

### Task 8: Frontend Sub-components (Theory, Quiz, Writing, Sidebar)

**Files:**
- Create: `frontend/src/components/Learning/TheoryContent.tsx`
- Create: `frontend/src/components/Learning/QuizContent.tsx`
- Create: `frontend/src/components/Learning/WritingContent.tsx`
- Create: `frontend/src/components/Learning/LessonResultModal.tsx`
- Create: `frontend/src/components/Learning/GamificationSidebar.tsx`

**Interfaces:**
- `TheoryContent`: hiển thị Markdown nội dung bài học, nút "Đã hiểu & Hoàn thành"
- `QuizContent`: chuyển đổi từng câu hỏi trắc nghiệm, hiển thị tiến độ 1/5 câu, chọn đáp án, nút nộp bài
- `WritingContent`: hiển thị đề bài, rubric tiêu chí, khung textarea có đếm từ/ký tự, hiển thị trạng thái loading khi AI chấm điểm
- `LessonResultModal`: modal chúc mừng khi qua bài, hiển thị điểm, XP nhận được, nút "Bài tiếp theo"
- `GamificationSidebar`: tách từ `LearningPathPage` hiện tại thành component dùng chung, kết nối API thay vì localStorage

- [ ] **Step 1: Tạo `TheoryContent.tsx`**
- [ ] **Step 2: Tạo `QuizContent.tsx` với tương tác chọn đáp án và xác nhận câu hỏi**
- [ ] **Step 3: Tạo `WritingContent.tsx` với giao diện nhập liệu và xem rubric**
- [ ] **Step 4: Tạo `LessonResultModal.tsx`**
- [ ] **Step 5: Tạo `GamificationSidebar.tsx`**
- [ ] **Step 6: Commit**
```bash
git add frontend/src/components/Learning
git commit -m "feat(learning): create learning interactive sub-components"
```

---

### Task 9: Frontend Pages & Router Integration

**Files:**
- Create: `frontend/src/pages/LessonPage.tsx`
- Modify: `frontend/src/pages/LearningPathPage.tsx:1-269`
- Modify: `frontend/src/router.tsx:50-70`

**Interfaces:**
- `LessonPage`: Route `/learning/lesson/:id`, load dữ liệu bài học theo ID từ API, render linh hoạt `TheoryContent`, `QuizContent` hoặc `WritingContent`.
- `LearningPathPage`: Refactor hoàn toàn để đọc dữ liệu từ `useLearningPath` và `useGamification`, giữ nguyên giao diện bản đồ SVG uốn lượn và hiệu ứng Duolingo đẹp mắt.
- `router.tsx`: Thêm route `/learning/lesson/:id` được bọc bởi `RequireAuth`.

- [ ] **Step 1: Viết `LessonPage.tsx` tích hợp các component bài học và xử lý tiêu hao mạng sống khi bắt đầu**
- [ ] **Step 2: Thêm route `/learning/lesson/:id` vào `frontend/src/router.tsx`**
- [ ] **Step 3: Refactor `LearningPathPage.tsx` thay thế dữ liệu hardcode bằng dữ liệu từ API**
- [ ] **Step 4: Kiểm tra build TypeScript của frontend**

Run: `cd frontend; npm run build`
Expected: Build thành công không có lỗi type hoặc linting.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages frontend/src/router.tsx
git commit -m "feat(learning): integrate LessonPage and refactor LearningPathPage with live API data"
```

---

### Task 10: Kiểm Thử Toàn Diện & Verification

**Files:**
- Modify: `frontend/src/pages/LearningPathPage.test.tsx` (nếu cần cập nhật mock API)
- Create: `frontend/src/pages/LessonPage.test.tsx`

- [ ] **Step 1: Chạy kiểm thử tự động toàn bộ Backend**
Run: `cd backend; php artisan test`
Expected: Tất cả bài test (gồm cả auth, presentation, và learning) đều PASS.

- [ ] **Step 2: Chạy kiểm thử tự động toàn bộ Frontend**
Run: `cd frontend; npm run test`
Expected: Tất cả vitest suites đều PASS.

- [ ] **Step 3: Kiểm thử luồng trải nghiệm thực tế (E2E Manual / Smoke test)**
1. Mở trang `/learning-path`: bản đồ hiển thị 7 sections từ Database, tiến độ chính xác.
2. Bấm vào bài học đang mở khóa: chuyển sang `/learning/lesson/{id}`.
3. Hoàn thành bài học: điểm số được chấm, nhận XP, hiển thị kết quả và mở khóa bài tiếp theo.
4. Trừ mạng và cập nhật streak hiển thị tức thì trên sidebar.

- [ ] **Step 4: Commit hoàn tất**
```bash
git add .
git commit -m "chore(learning): verify and complete learning path feature implementation"
```
