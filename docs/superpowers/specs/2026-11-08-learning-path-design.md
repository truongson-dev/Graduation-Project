# Learning Path Feature — Design Spec

**Date:** 2026-11-08
**Status:** Reviewed & Updated (v2)
**Scope:** Full-stack learning path with gamification, replacing hardcoded frontend data

---

## 1. Overview

Build a full-stack learning path system for the SoftSkill AI app. Students follow a linear, Duolingo-style roadmap through soft-skill topics (communication, listening, feedback, presentation, interviewing). Each section contains lessons of three types: theory, quiz, and writing exercises (AI-graded via Gemini). Gamification elements (XP, streak, lives, tournaments) move from localStorage to backend persistence.

### Success Criteria

- All learning path data served from backend API; zero hardcoded content in frontend
- Students can read theory, take quizzes, and submit writing exercises
- Quiz grading is server-side; writing exercises are graded by Gemini API
- Linear unlock: lesson N+1 unlocks only when lesson N is passed (score ≥ threshold)
- XP, streak, lives, and tournament data persisted per-user in the database
- Seeder populates the 7 existing sections with sample lessons
- Existing frontend UI style preserved (Duolingo roadmap, SVG path, node circles)

---

## 2. Database Schema

### 2.1 Content Tables

#### `learning_paths`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `title` | string | "Kỹ năng mềm" |
| `description` | text, nullable | |
| `slug` | string, unique | "ky-nang-mem" |
| `sort_order` | integer, default 0 | |
| `is_active` | boolean, default true | |
| `timestamps` | | |

#### `sections`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `learning_path_id` | FK → learning_paths | cascade delete |
| `title` | string | "Giao tiếp tự tin" |
| `subtitle` | string, nullable | "Kỹ năng 1" |
| `icon` | string | Material icon name: "chat_bubble" |
| `sort_order` | integer | |
| `timestamps` | | |

#### `lessons`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `section_id` | FK → sections | cascade delete |
| `title` | string | "Diễn đạt ý tưởng rõ ràng" |
| `type` | enum: theory, quiz, writing | |
| `sort_order` | integer | |
| `content_json` | JSON | Structure depends on type (see §2.2) |
| `pass_threshold` | integer, default 70 | Score needed to pass (0-100). Theory lessons use 0 (auto-pass on read). |
| `xp_reward` | integer, default 15 | XP earned on first pass |
| `timestamps` | | |

### 2.2 content_json Structures

**Theory:**
```json
{
  "markdown": "## Nguyên tắc giao tiếp\n\nGiao tiếp hiệu quả bao gồm...",
  "images": [
    { "url": "/images/learning/communication-01.png", "alt": "Sơ đồ giao tiếp" }
  ]
}
```

**Quiz:**
```json
{
  "questions": [
    {
      "text": "Khi lắng nghe, điều quan trọng nhất là gì?",
      "options": [
        "Chuẩn bị câu trả lời trong đầu",
        "Tập trung vào người nói và nội dung",
        "Ghi chép mọi thứ",
        "Ngắt lời để hỏi ngay"
      ],
      "correct": 1,
      "explanation": "Tập trung vào người nói giúp bạn hiểu đúng ý nghĩa..."
    }
  ]
}
```

**Writing:**
```json
{
  "prompt": "Viết một email phản hồi cho đồng nghiệp về bài thuyết trình của họ. Email cần nhận xét ít nhất 1 điểm mạnh và 1 gợi ý cải thiện.",
  "rubric": "Chấm theo 4 tiêu chí: Cấu trúc email (25đ), Nhận xét cụ thể (25đ), Giọng văn tôn trọng (25đ), Gợi ý khả thi (25đ)",
  "sample_answer": "Chào anh Minh,\n\nCảm ơn anh đã chia sẻ bài thuyết trình..."
}
```

### 2.3 Progress Tables

#### `user_lesson_progress`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK → users | cascade delete |
| `lesson_id` | FK → lessons | cascade delete |
| `status` | enum: locked, unlocked, in_progress, passed, failed | default: locked |
| `best_score` | integer, nullable | 0-100 |
| `xp_earned` | integer, default 0 | |
| `completed_at` | timestamp, nullable | |
| `timestamps` | | |
| | unique(user_id, lesson_id) | |

#### `user_lesson_attempts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK → users | cascade delete |
| `lesson_id` | FK → lessons | cascade delete |
| `attempt_number` | integer | |
| `answers_json` | JSON | User's submitted answers or writing content |
| `score` | integer | 0-100 |
| `ai_feedback` | text, nullable | Gemini feedback for writing exercises |
| `passed` | boolean | |
| `timestamps` | | created_at + updated_at (updated_at needed for async AI grading retry) |

### 2.4 Gamification Tables

#### `user_gamification`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK → users, unique | cascade delete |
| `total_xp` | integer, default 0 | |
| `current_streak` | integer, default 0 | Consecutive days |
| `longest_streak` | integer, default 0 | |
| `lives_count` | integer, default 5 | Max 5 |
| `lives_refill_at` | timestamp, nullable | Null when lives > 0 |
| `tournament_tier` | string, default 'Đồng' | Đồng/Bạc/Vàng/Kim cương |
| `tournament_rank` | integer, nullable | Position in current tier |
| `timestamps` | | |

#### `user_daily_streaks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `user_id` | FK → users | cascade delete |
| `date` | date | |
| `xp_earned` | integer, default 0 | XP earned that day |
| `lessons_completed` | integer, default 0 | |
| | unique(user_id, date) | |

---

## 3. API Design

All endpoints under `v1/learning`, require `auth:sanctum`.

### 3.1 Content Endpoints (Read-only)

#### `GET /v1/learning/paths`
Returns list of active learning paths.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Kỹ năng mềm",
      "slug": "ky-nang-mem",
      "description": "...",
      "sections_count": 7,
      "user_progress": {
        "completed_sections": 1,
        "total_sections": 7,
        "percentage": 14
      }
    }
  ]
}
```

#### `GET /v1/learning/paths/{slug}`
Returns path with all sections and per-section user progress.

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Kỹ năng mềm",
    "slug": "ky-nang-mem",
    "sections": [
      {
        "id": 1,
        "title": "Khởi động",
        "subtitle": "Làm quen hành trình",
        "icon": "flag",
        "sort_order": 0,
        "lessons_count": 3,
        "status": "complete",
        "progress": { "completed": 3, "total": 3 }
      },
      {
        "id": 2,
        "title": "Giao tiếp tự tin",
        "subtitle": "Kỹ năng 1",
        "icon": "chat_bubble",
        "sort_order": 1,
        "lessons_count": 4,
        "status": "current",
        "progress": { "completed": 2, "total": 4 }
      }
    ]
  }
}
```

Section `status` is derived: `complete` (all lessons passed), `current` (first section with incomplete lessons), `locked` (all prior sections not complete).

#### `GET /v1/learning/sections/{id}`
Returns section detail with all lessons and their user status.

**Response:**
```json
{
  "data": {
    "id": 2,
    "title": "Giao tiếp tự tin",
    "subtitle": "Kỹ năng 1",
    "icon": "chat_bubble",
    "lessons": [
      {
        "id": 4,
        "title": "Diễn đạt ý tưởng rõ ràng",
        "type": "theory",
        "sort_order": 0,
        "status": "passed",
        "best_score": 100,
        "xp_reward": 15
      },
      {
        "id": 5,
        "title": "Bắt đầu và duy trì cuộc trò chuyện",
        "type": "quiz",
        "sort_order": 1,
        "status": "unlocked",
        "best_score": null,
        "xp_reward": 15
      }
    ]
  }
}
```

#### `GET /v1/learning/lessons/{id}`
Returns lesson content. For quiz type, correct answers are NOT included.

**Response (quiz example):**
```json
{
  "data": {
    "id": 5,
    "title": "Bắt đầu và duy trì cuộc trò chuyện",
    "type": "quiz",
    "section": { "id": 2, "title": "Giao tiếp tự tin" },
    "status": "unlocked",
    "pass_threshold": 70,
    "xp_reward": 15,
    "content": {
      "questions": [
        {
          "text": "Cách tốt nhất để bắt đầu trò chuyện là gì?",
          "options": ["Nói về thời tiết", "Đặt câu hỏi mở", "Kể chuyện cười", "Im lặng chờ"]
        }
      ]
    }
  }
}
```

### 3.2 Attempt Endpoints

#### `POST /v1/learning/lessons/{id}/attempt`

**Validation rules:**

| Field | Rule | Notes |
|-------|------|-------|
| `answers` | required_if type=quiz, array, size must match questions count | Quiz only |
| `answers.*` | integer, min:0, max:options count-1 | Each answer index |
| `content` | required_if type=writing, string, min:50, max:5000 | Writing only |
| `completed` | required_if type=theory, boolean, must be true | Theory only |

**Quiz body:**
```json
{ "answers": [1, 0, 2, 1] }
```

**Writing body:**
```json
{ "content": "Kính gửi anh/chị..." }
```

**Theory body:**
```json
{ "completed": true }
```

**Response:**
```json
{
  "data": {
    "attempt_id": 42,
    "score": 85,
    "passed": true,
    "xp_earned": 15,
    "results": [
      { "question_index": 0, "correct": true, "explanation": "..." },
      { "question_index": 1, "correct": false, "correct_answer": 2, "explanation": "..." }
    ],
    "ai_feedback": {
      "summary": "Bài viết rõ ràng, đúng trọng tâm và thể hiện sự tôn trọng.",
      "strengths": ["Cấu trúc thư đầy đủ", "Đưa ra lời khen chân thành"],
      "improvements": ["Cần gợi ý giải pháp cụ thể hơn ở phần kết"]
    },
    "next_lesson": { "id": 6, "title": "Đặt câu hỏi đúng trọng tâm" }
  }
}
```

For quiz exercises, `ai_feedback` is null and `results` is populated.
For writing exercises, `results` is null and `ai_feedback` contains structured output (`summary`, `strengths`, `improvements`) from `AnswerGrader`.
For theory lessons, both `results` and `ai_feedback` are null, and `score` is always 100.

#### `GET /v1/learning/lessons/{id}/attempts`
Returns attempt history for the authenticated user.

#### `GET /v1/learning/progress`
Returns overall progress summary.

```json
{
  "data": {
    "path_title": "Kỹ năng mềm",
    "completed_sections": 1,
    "total_sections": 7,
    "completed_lessons": 5,
    "total_lessons": 25,
    "percentage": 20,
    "next_lesson": { "id": 6, "title": "Đặt câu hỏi đúng trọng tâm", "section": "Giao tiếp tự tin" }
  }
}
```

### 3.3 Gamification Endpoints

#### `GET /v1/learning/gamification`
```json
{
  "data": {
    "total_xp": 1250,
    "current_streak": 7,
    "longest_streak": 14,
    "lives_count": 3,
    "lives_max": 5,
    "lives_refill_at": null,
    "tournament_tier": "Vàng",
    "tournament_rank": 9
  }
}
```

#### `POST /v1/learning/lives/consume`
Decrements lives by 1. Returns 422 if lives = 0.

```json
{
  "data": {
    "lives_count": 2,
    "lives_refill_at": null
  }
}
```

When lives reach 0, `lives_refill_at` is set to `now + 24h`. A scheduled check (or lazy check on next API call) restores lives when the timestamp passes.

#### `GET /v1/learning/leaderboard`
```json
{
  "data": {
    "tier": "Vàng",
    "week_start": "2026-11-02",
    "rankings": [
      { "rank": 1, "user_name": "Minh T.", "xp_this_week": 320 },
      { "rank": 2, "user_name": "Lan N.", "xp_this_week": 280 }
    ],
    "user_rank": 9,
    "user_xp_this_week": 95
  }
}
```

#### `GET /v1/learning/streak`
```json
{
  "data": {
    "current_streak": 7,
    "longest_streak": 14,
    "this_week": [
      { "day": "T2", "date": "2026-11-02", "completed": true, "xp": 45 },
      { "day": "T3", "date": "2026-11-03", "completed": true, "xp": 30 }
    ],
    "completed_today": true
  }
}
```

---

## 4. Backend Architecture

### 4.1 Models

```
app/Models/
├── LearningPath.php
├── Section.php
├── Lesson.php
├── UserLessonProgress.php
├── UserLessonAttempt.php
├── UserGamification.php
└── UserDailyStreak.php
```

Key relationships:
- `LearningPath` hasMany `Section` (ordered by sort_order)
- `Section` belongsTo `LearningPath`, hasMany `Lesson`
- `Lesson` belongsTo `Section`; `content_json` cast as `array`
- `User` hasOne `UserGamification`; hasMany `UserLessonProgress`, `UserDailyStreak`
- `UserLessonProgress` unique on (user_id, lesson_id)

### 4.2 Services

```
app/Services/Learning/
├── LessonAttemptService.php
├── ProgressService.php
├── GamificationService.php
└── LeaderboardService.php
```

**LessonAttemptService::submit(User, Lesson, array $input): AttemptResult**

1. Validate lesson is unlocked for user, user has lives > 0
2. Grade submission based on type:
   - **Theory:** score = 100, auto-pass (no grading needed)
   - **Quiz:** compare `$input['answers']` vs `content_json.questions[].correct`, calculate percentage
   - **Writing:** reuse existing `AnswerGrader` agent (see §4.7). If AI is not configured, return 503 early.
3. Create `UserLessonAttempt` record
4. If score ≥ `pass_threshold` (theory always passes since threshold = 0):
   - Update `UserLessonProgress` → status = passed, completed_at = now
   - Call `ProgressService::unlockNext()` → unlock next lesson
   - Call `GamificationService::awardXp()` → add xp_reward (only on first pass)
5. Call `GamificationService::recordActivity()` → update daily streak
6. Return result with score, feedback, next_lesson

**ProgressService::unlockNext(User, Lesson)**

- Find next lesson in same section (sort_order + 1)
- If no more lessons in section → find first lesson of next section
- Create/update `UserLessonProgress` → status = unlocked
- If all lessons in section are passed → mark section as complete

**GamificationService::awardXp(User, int $amount)**

- Increment `user_gamification.total_xp`
- Upsert `user_daily_streaks` for today: increment `xp_earned`

**GamificationService::recordActivity(User)**

- Upsert `user_daily_streaks` for today
- Recalculate `current_streak`: count consecutive days backwards from today where `user_daily_streaks` record exists
- Update `longest_streak` if current > longest

**GamificationService::consumeLife(User)**

- Decrement `lives_count`
- If reaches 0: set `lives_refill_at` = now + 24h

**GamificationService::checkLifeRefill(User)** (called lazily on any gamification read)

- If `lives_refill_at` is past: reset `lives_count` = 5, clear `lives_refill_at`

### 4.3 Controllers

```
app/Http/Controllers/Api/V1/Learning/
├── LearningPathController.php     → index, show
├── SectionController.php          → show
├── LessonController.php           → show
├── LessonAttemptController.php    → store, index
├── ProgressController.php         → index
├── GamificationController.php     → show, consumeLife
├── LeaderboardController.php      → index
└── StreakController.php            → show
```

### 4.4 Routes

```php
Route::prefix('v1/learning')->middleware('auth:sanctum')->group(function () {
    // Content & progress — no AI dependency
    Route::get('/paths', [LearningPathController::class, 'index']);
    Route::get('/paths/{slug}', [LearningPathController::class, 'show']);
    Route::get('/sections/{id}', [SectionController::class, 'show']);
    Route::get('/lessons/{id}', [LessonController::class, 'show']);
    Route::get('/lessons/{id}/attempts', [LessonAttemptController::class, 'index']);
    Route::get('/progress', [ProgressController::class, 'index']);

    // Attempt submission — AI check handled inside service for writing type only
    Route::post('/lessons/{id}/attempt', [LessonAttemptController::class, 'store']);

    // Gamification
    Route::get('/gamification', [GamificationController::class, 'show']);
    Route::post('/lives/consume', [GamificationController::class, 'consumeLife']);
    Route::get('/leaderboard', [LeaderboardController::class, 'index']);
    Route::get('/streak', [StreakController::class, 'show']);
});
```

> **Note:** `EnsureAiConfigured` is NOT applied at the route level. Instead,
> `LessonAttemptService` checks AI availability at runtime only for writing
> lessons. This allows quiz and theory lessons to work even when `GEMINI_API_KEY`
> is not set, matching the existing app behavior where basic flows run without
> AI credentials (see README §6).

### 4.5 User Initialization

When a user first accesses the learning path (or on registration), the system auto-creates:
- `UserGamification` record with defaults (5 lives, 0 XP, 0 streak)
- `UserLessonProgress` records: first lesson of first section = `unlocked`, all others = `locked`

This can be handled lazily (on first API call) via `ProgressService::initializeForUser()`.

### 4.6 Seeder

`LearningPathSeeder` creates:

1. **1 LearningPath**: "Kỹ năng mềm" (slug: ky-nang-mem)
2. **7 Sections** with the existing titles/icons:
   - Khởi động (flag)
   - Giao tiếp tự tin (chat_bubble)
   - Lắng nghe chủ động (headphones)
   - Phản hồi tích cực (thumb_up)
   - Thuyết trình cuốn hút (slideshow)
   - Phỏng vấn chuyên nghiệp (work)
   - Tự tin bứt phá (stars)
3. **~25 Lessons** matching the existing lesson titles in the frontend, each with sample content:
   - Theory lessons with Vietnamese markdown content
   - Quiz lessons with 4-5 questions each
   - Writing lessons with prompts and rubrics

### 4.7 AI Integration (Writing Lessons)

Writing grading leverages the existing Laravel AI Agent infrastructure:

- Reuses `App\Ai\Agents\AnswerGrader` directly (which already implements structured output schema: `score`, `summary`, `strengths`, `improvements` and prompt injection safeguards).
- Reuses `App\Data\Ai\AnswerFeedbackData` for formatting structured output.
- Parameters mapped from Lesson:
  - `skill`: `$lesson->section->title` (e.g. "Giao tiếp tự tin")
  - `question`: `$lesson->content_json['prompt']`
  - `answer`: `$input['content']`
  - `context`: `$lesson->content_json['rubric'] ?? null`
- **Graceful degradation:** If `config('ai.providers.gemini.key')` or the configured provider key is missing, writing lesson submissions fail with 503 HTTP status ("Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.") while quiz and theory lessons remain 100% functional.
- Synchronous response pattern with frontend loading state (same timeout of 45s as `FeedbackController`).

---

## 5. Frontend Architecture

### 5.1 Changed Files

#### `LearningPathPage.tsx` — Refactor

Remove all hardcoded data (`learningNodes`, `learningSections`). Replace with:
- `useLearningPath('ky-nang-mem')` → fetches path + sections + progress
- `useGamification()` → fetches XP, streak, lives, tournament
- Click "BẮT ĐẦU" → `navigate('/learning/lesson/{id}')` instead of local state
- Preserve existing UI (SVG roadmap, node circles, section list, sidebar widgets)

#### `router.tsx` — Add routes

```tsx
{ path: '/learning/lesson/:id', element: <RequireAuth><LessonPage /></RequireAuth> },
{ path: '/learning/lesson/:id/result', element: <RequireAuth><LessonResultPage /></RequireAuth> },
```

### 5.2 New Files

#### Pages
- `LessonPage.tsx` — Main lesson view; renders TheoryContent, QuizContent, or WritingContent based on lesson type
- `LessonResultPage.tsx` — Shows score, detailed results, AI feedback, next lesson button

#### Hooks
- `useLearningPath.ts` — `useQuery` for GET /paths/{slug}
- `useSection.ts` — `useQuery` for GET /sections/{id}
- `useLesson.ts` — `useQuery` for GET /lessons/{id}
- `useLessonAttempt.ts` — `useMutation` for POST /lessons/{id}/attempt
- `useGamification.ts` — `useQuery` for GET /gamification
- `useConsumeLife.ts` — `useMutation` for POST /lives/consume

#### Components (`components/learning/`)
- `TheoryContent.tsx` — Renders markdown + images; "Tiếp tục" button at bottom auto-passes theory lessons
- `QuizContent.tsx` — Steps through questions one at a time; collects answers; submit button
- `WritingContent.tsx` — Textarea with word count; submit button with loading state (Gemini call)
- `LessonResult.tsx` — Score display, per-question results, AI feedback panel
- `GamificationSidebar.tsx` — Extracted from current LearningPathPage sidebar; reusable XP/streak/lives/tournament widgets

### 5.3 Theory Lesson Flow

Theory lessons are "read-through" — no quiz. The pass condition is reading the content:
1. User opens theory lesson → content renders
2. User scrolls to bottom or clicks "Đã đọc xong"
3. Frontend calls `POST /lessons/{id}/attempt` with `{ "completed": true }`
4. Backend marks it passed (score = 100), awards XP, unlocks next lesson

### 5.4 State Management

Continue using TanStack Query (already installed). Key cache keys:
- `['learning-path', slug]`
- `['section', id]`
- `['lesson', id]`
- `['gamification']`
- `['streak']`

After a successful attempt submission, invalidate: `['learning-path']`, `['section']`, `['lesson']`, `['gamification']`, `['streak']`.

---

## 6. Error Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Lesson is locked | 403 + message | Redirect to learning path |
| No lives remaining | 422 + refill_at | Show refill timer, disable start |
| Quiz answers count mismatch | 422 validation error | Show error toast |
| Writing content too short | 422 validation error | Inline validation |
| Gemini API failure | 503 + retry | Show error, allow retry |
| Already passed (re-attempt) | Allow, but no additional XP | Show "Ôn tập" instead of "Bắt đầu" |

---

## 7. Testing Strategy

### Backend
- **Unit tests** for Services: LessonAttemptService (quiz grading logic, score calculation), ProgressService (unlock logic), GamificationService (XP, streak, lives)
- **Feature tests** for API endpoints: auth required, correct responses, attempt flow, progress tracking
- **Seeder test**: Run seeder, verify data integrity

### Frontend
- **Component tests** for QuizContent (answer selection, submit), WritingContent (textarea, validation)
- **Hook tests** for useLearningPath, useGamification (mock API responses)
- **Integration**: LessonPage renders correct content type based on lesson.type

---

## 8. Migration Order

This is the recommended implementation sequence:

1. **Backend Schema + Models** — migrations, models with relationships, casts
2. **Seeder** — populate with 7 sections, ~25 lessons of sample content
3. **Backend Services** — ProgressService, LessonAttemptService, GamificationService
4. **Backend Controllers + Routes** — wire up all endpoints
5. **Backend Tests** — unit + feature tests
6. **Frontend API Layer** — add learning endpoints to `endpoints` in `frontend/src/lib/api.ts`, declare TypeScript types, write hooks (`useLearningPath`, `useLesson`, `useGamification`, etc.)
7. **Frontend Components** — TheoryContent, QuizContent, WritingContent, LessonResult, GamificationSidebar
8. **Frontend Pages** — LessonPage, LessonResultPage
9. **LearningPathPage Refactor** — replace hardcoded data with API calls
10. **Frontend Tests** — component + hook tests
11. **Integration Testing** — full flow: start lesson → submit → see result → next lesson unlocks

---

## 9. Out of Scope

The following are explicitly NOT included in this design:

- Admin UI for managing content (content managed via seeder/DB)
- Video content type
- Audio/speaking practice lessons (existing presentation feature handles this separately)
- Placement tests / section skipping
- Push notifications
- Offline support
- Social features (sharing progress, challenges between users)
- Advanced analytics / learning insights dashboard
