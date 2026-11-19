# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive Profile page for students in SoftSkill AI, supporting personal showcase (stats, achievements, community posts), account management dialogs (edit info, change password), and dual-mode viewing (own profile vs. other students).

**Architecture:** Laravel Sanctum backend API (`/api/v1/profile/*`) returning aggregated profile data and handling profile/password mutations; React + Vite frontend under `features/profile/` with React Query, modular cards, and dialogs.

**Tech Stack:** Laravel 11, PHP 8.2+, Sanctum, MySQL/SQLite, React 19, TypeScript, Tailwind CSS, Lucide icons, Vitest / PHPUnit.

**Spec:** `docs/superpowers/specs/2026-11-13-profile-page-design.md`

## Global Constraints
- Do not break existing authentication or community APIs.
- Follow existing layout patterns (`StudentPageLayout`).
- Omit email from public profile payloads when `is_own_profile` is false.
- Ensure password changes require and verify the current password.
- Keep tasks bite-sized with test-driven steps.

---

### Task 1: Backend Profile Aggregation & Query Endpoints

**Files:**
- Create: `backend/app/Http/Controllers/Api/V1/Profile/ProfileController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/Profile/ProfileQueryTest.php`

**Interfaces:**
- Consumes: `App\Models\User`, `App\Models\CommunityProfile`, `App\Models\PresentationSession`, `App\Models\CommunityPost`
- Produces: `GET /api/v1/profile/me` and `GET /api/v1/profile/{id}` returning:
  `{ user, community_profile, stats, achievements, posts, is_own_profile, is_following }`

- [ ] **Step 1: Write failing backend test for Profile Query endpoints**
```php
<?php

namespace Tests\Feature\Profile;

use App\Models\CommunityPost;
use App\Models\CommunityProfile;
use App\Models\PresentationSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_own_profile_with_stats(): void
    {
        $user = User::factory()->create(['name' => 'Tran Van A']);
        CommunityProfile::create([
            'user_id' => $user->id,
            'username' => 'tranvana',
            'headline' => 'Học viên đam mê giao tiếp',
            'bio' => 'Tự tin thuyết trình trước đám đông.',
        ]);

        PresentationSession::factory()->create([
            'user_id' => $user->id,
            'overall_score' => 85,
            'audio_duration_seconds' => 120,
        ]);

        CommunityPost::create([
            'user_id' => $user->id,
            'content' => 'Bài viết đầu tiên của tôi',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/profile/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('community_profile.username', 'tranvana')
            ->assertJsonPath('stats.presentation_count', 1)
            ->assertJsonPath('stats.average_score', 8.5)
            ->assertJsonPath('is_own_profile', true);
    }

    public function test_authenticated_user_can_fetch_another_users_public_profile(): void
    {
        $viewer = User::factory()->create();
        $target = User::factory()->create(['name' => 'Nguyen Van B']);
        CommunityProfile::create([
            'user_id' => $target->id,
            'username' => 'nguyenvanb',
        ]);

        $response = $this->actingAs($viewer, 'sanctum')->getJson("/api/v1/profile/{$target->id}");

        $response->assertOk()
            ->assertJsonPath('user.id', $target->id)
            ->assertJsonPath('user.email', null)
            ->assertJsonPath('is_own_profile', false)
            ->assertJsonPath('is_following', false);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd backend && php artisan test --filter=ProfileQueryTest`
Expected: FAIL (Route not defined or 404)

- [ ] **Step 3: Implement ProfileController and register routes**
In `backend/app/Http/Controllers/Api/V1/Profile/ProfileController.php`:
Implement `me()` and `show($id)` methods aggregating presentation session metrics, followers count, community posts, and community profile details. In `backend/routes/api.php`, register:
```php
Route::prefix('v1/profile')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [ProfileController::class, 'me'])->name('api.v1.profile.me');
    Route::get('/{id}', [ProfileController::class, 'show'])->name('api.v1.profile.show');
    Route::put('/', [ProfileController::class, 'update'])->name('api.v1.profile.update');
    Route::put('/password', [ProfileController::class, 'updatePassword'])->name('api.v1.profile.password');
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `cd backend && php artisan test --filter=ProfileQueryTest`
Expected: PASS

---

### Task 2: Backend Profile Mutation Endpoints (Edit Profile & Change Password)

**Files:**
- Modify: `backend/app/Http/Controllers/Api/V1/Profile/ProfileController.php`
- Create: `backend/app/Http/Requests/Profile/UpdateProfileRequest.php`
- Create: `backend/app/Http/Requests/Profile/UpdatePasswordRequest.php`
- Test: `backend/tests/Feature/Profile/ProfileMutationTest.php`

**Interfaces:**
- Consumes: `PUT /api/v1/profile`, `PUT /api/v1/profile/password`
- Produces: Updated user & community profile data, password change verification

- [ ] **Step 1: Write failing test for Profile Mutations**
```php
<?php

namespace Tests\Feature\Profile;

use App\Models\CommunityProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_profile_info(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);
        CommunityProfile::create(['user_id' => $user->id, 'username' => 'olduser']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'New Name',
            'headline' => 'Senior Soft Skill Learner',
            'bio' => 'Cập nhật tiểu sử mới.',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name', 'avatar_url' => 'https://example.com/avatar.png']);
        $this->assertDatabaseHas('community_profiles', ['user_id' => $user->id, 'headline' => 'Senior Soft Skill Learner']);
    }

    public function test_user_can_change_password_with_valid_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/password', [
            'current_password' => 'old-password-123',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password-456', $user->fresh()->password));
    }

    public function test_change_password_fails_if_current_password_incorrect(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-password')]);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/password', [
            'current_password' => 'wrong-password',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['current_password']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd backend && php artisan test --filter=ProfileMutationTest`
Expected: FAIL

- [ ] **Step 3: Implement validation requests and controller actions**
Implement `UpdateProfileRequest` with:
- `name` => `required|string|max:100`
- `avatar_url` => `nullable|url|max:2048`
- `headline` => `nullable|string|max:120`
- `bio` => `nullable|string|max:280`

Implement `UpdatePasswordRequest` with:
- `current_password` => `required|string`
- `new_password` => `required|string|min:8|confirmed`

Implement `update()` and `updatePassword()` on `ProfileController`.

- [ ] **Step 4: Run test to verify it passes**
Run: `cd backend && php artisan test --filter=ProfileMutationTest`
Expected: PASS

---

### Task 3: Frontend Profile Types & React Query Hooks

**Files:**
- Create: `frontend/src/features/profile/types/profile.ts`
- Create: `frontend/src/features/profile/api/useProfile.ts`
- Test: `frontend/src/features/profile/api/useProfile.test.ts`

**Interfaces:**
- Produces: `UserProfileResponse`, `useMyProfileQuery()`, `useUserProfileQuery(id)`, `useUpdateProfileMutation()`, `useChangePasswordMutation()`

- [ ] **Step 1: Write unit test for React Query profile hooks**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMyProfileQuery } from './useProfile';

describe('useProfile hooks', () => {
  it('fetches authenticated user profile successfully', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMyProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Implement profile types and API hooks**
Define TypeScript interfaces in `frontend/src/features/profile/types/profile.ts`:
- `UserProfileData`
- `ProfileStats`
- `ProfileAchievement`
- `ProfilePost`
- `UpdateProfilePayload`
- `ChangePasswordPayload`

Implement `useProfile.ts` using `apiClient` (`frontend/src/core/api/client.ts`) with optimistic cache invalidation for profile edits.

- [ ] **Step 3: Run unit test to verify it passes**
Run: `pnpm --prefix frontend test useProfile.test.ts`
Expected: PASS

---

### Task 4: Frontend Profile Presentation Cards

**Files:**
- Create: `frontend/src/features/profile/components/ProfileHeaderCard.tsx`
- Create: `frontend/src/features/profile/components/ProfileStatsCard.tsx`
- Create: `frontend/src/features/profile/components/ProfileAchievements.tsx`
- Create: `frontend/src/features/profile/components/ProfilePostsList.tsx`
- Test: `frontend/src/features/profile/components/ProfileCards.test.tsx`

**Interfaces:**
- `ProfileHeaderCard`: Renders avatar, name, bio, follower count, action buttons ("Chỉnh sửa hồ sơ", "Đổi mật khẩu", or "Theo dõi")
- `ProfileStatsCard`: 3 stat boxes (Average Score, Completed Sessions, Practice Duration)
- `ProfileAchievements`: Badge cards + link to `/achievements`
- `ProfilePostsList`: User post feed with empty state

- [ ] **Step 1: Write component tests for Profile Cards**
Verify:
- `ProfileHeaderCard` renders Edit & Password buttons when `isOwnProfile={true}`
- `ProfileHeaderCard` renders Follow button when `isOwnProfile={false}`
- `ProfileStatsCard` correctly formats and renders average score and duration
- `ProfileAchievements` renders unlocked badges
- `ProfilePostsList` renders posts list or empty message when no posts exist

- [ ] **Step 2: Implement UI Cards with Tailwind CSS**
Build the components adhering to the SkillBridge design token guidelines (`StudentPageLayout`, Slate colors, rounded-2xl cards, Material Symbols / Lucide icons).

- [ ] **Step 3: Run component tests to verify they pass**
Run: `pnpm --prefix frontend test ProfileCards.test.tsx`
Expected: PASS

---

### Task 5: Frontend Profile Dialogs (Edit Profile & Change Password)

**Files:**
- Create: `frontend/src/features/profile/components/EditProfileDialog.tsx`
- Create: `frontend/src/features/profile/components/ChangePasswordDialog.tsx`
- Test: `frontend/src/features/profile/components/ProfileDialogs.test.tsx`

**Interfaces:**
- `EditProfileDialog`: Modal using Shadcn `Dialog` with inputs for name, headline, bio, avatarUrl.
- `ChangePasswordDialog`: Modal with current password, new password, confirmation password, and validation feedback.

- [ ] **Step 1: Write failing tests for Profile Dialogs**
Verify:
- `EditProfileDialog` opens, pre-fills existing user name/headline/bio, and calls update mutation on submit.
- `ChangePasswordDialog` validates matching passwords and calls change password mutation on submit.

- [ ] **Step 2: Implement EditProfileDialog and ChangePasswordDialog**
Build dialogs with accessible labels, error message displays, and loading spinners during submit.

- [ ] **Step 3: Run tests to verify they pass**
Run: `pnpm --prefix frontend test ProfileDialogs.test.tsx`
Expected: PASS

---

### Task 6: Frontend Profile Page Orchestration & Route Integration

**Files:**
- Create: `frontend/src/features/profile/pages/ProfilePage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/components/layout/StudentPageLayout.tsx`
- Modify: `frontend/src/features/community/components/CommunityAuthorAvatar.tsx`
- Modify: `frontend/src/features/community/components/ThreadPostCard.tsx`
- Test: `frontend/src/features/profile/pages/ProfilePage.test.tsx`

**Interfaces:**
- Route: `/profile` (own profile)
- Route: `/profile/:id` (public student profile)
- User dropdown in `StudentPageLayout`: Links "Tài khoản" to `/profile`
- Community post authors: Clicking author avatar or username navigates to `/profile/:id`

- [ ] **Step 1: Write integration tests for ProfilePage**
Verify:
- Navigating to `/profile` loads own profile and shows edit buttons.
- Navigating to `/profile/:id` loads target student profile and shows follow button.
- Clicking "Tài khoản" in the user dropdown navigates to `/profile`.

- [ ] **Step 2: Implement ProfilePage and connect routes**
Assemble all 4 blocks and 2 dialogs in `ProfilePage.tsx`. Register `/profile` and `/profile/:id` in `router/index.tsx`. Update the dropdown in `StudentPageLayout.tsx` and author links in `CommunityPage`.

- [ ] **Step 3: Run integration tests to verify they pass**
Run: `pnpm --prefix frontend test ProfilePage.test.tsx`
Expected: PASS

---

### Task 7: Full Test Suite Verification

- [ ] **Step 1: Run complete backend test suite**
Run: `cd backend && php artisan test`
Expected: ALL PASS

- [ ] **Step 2: Run complete frontend test suite**
Run: `pnpm --prefix frontend test --run`
Expected: ALL PASS
