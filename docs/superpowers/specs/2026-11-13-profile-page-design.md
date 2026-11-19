# Profile Page Feature — Design Spec

**Date:** 2026-11-13  
**Status:** Approved & Ready for Planning  
**Scope:** Full-stack Profile Page (Hybrid Personal Showcase & Account Management)

---

## 1. Overview & Goals

Build a complete, responsive Profile page for students in the SoftSkill AI platform. The profile serves as:
1. **Personal Showcase (Hồ sơ năng lực):** Highlights user info, presentation practice metrics, unlocked achievements, and community activity.
2. **Account Management (Quản lý tài khoản):** Modal-based profile editing (name, headline, bio, avatar) and password changing.
3. **Dual-Mode Viewing (Đa năng):**
   - Own profile (`/profile`): Displays full details plus "Chỉnh sửa hồ sơ" and "Đổi mật khẩu" action buttons.
   - Other users' profiles (`/profile/:id`): Displays public details and a "Theo dõi / Bỏ theo dõi" (Follow/Unfollow) toggle button instead of editing controls.

---

## 2. Page Layout & Content Architecture

The page is rendered within the existing `StudentPageLayout` for visual and functional consistency.

### 2.1 Block 1: Profile Header Card (Thẻ thông tin cá nhân)
- **Avatar:** Large user avatar (supports custom image URL or initials fallback with vibrant background).
- **Core Identity:** Full name, `@username`, Headline (chức danh ngắn / câu nói yêu thích, e.g. "Sinh viên CNTT đam mê kỹ năng giao tiếp"), and Bio (tiểu sử).
- **Social Counters:** Count of `Followers` and `Following`.
- **Joined Date:** Month/Year the user joined SkillBridge.
- **Action Buttons:**
  - *When viewing own profile:*
    - "Chỉnh sửa hồ sơ" (Icon: `edit`) -> Opens `EditProfileDialog`.
    - "Đổi mật khẩu" (Icon: `lock`) -> Opens `ChangePasswordDialog`.
  - *When viewing another student:*
    - "Theo dõi" / "Đang theo dõi" (Icon: `person_add` / `check`) with instant optimistic update.

### 2.2 Block 2: AI Practice Stats (Thống kê luyện tập AI)
Displays 3 key cards summarizing AI presentation performance from `presentation_sessions`:
1. **Điểm trung bình (Average Score):** Overall score scale out of 10 or 100 (e.g. `8.4 / 10`).
2. **Số bài đã thực hành (Sessions Count):** Total completed presentation practice sessions.
3. **Thời lượng luyện tập (Total Practice Time):** Total spoken audio duration formatted in minutes/hours.

### 2.3 Block 3: Achievements Showcase (Kệ huy hiệu & Thành tích)
- Visual grid of unlocked badges and milestone awards.
- Quick link ("Xem tất cả" -> `/achievements`) to open the full achievements gallery.

### 2.4 Block 4: Community Posts & Activity (Hoạt động cộng đồng)
- Feed of posts and discussions authored by this student.
- Each item reuses the lightweight post card style (title, topic tag, likes count, replies count, relative time).
- Empty state: Friendly message with call-to-action when no posts exist.

---

## 3. Modal Dialogs (Pop-up Chỉnh sửa)

### 3.1 EditProfileDialog ("Chỉnh sửa hồ sơ")
- **Fields:**
  - `name`: Text input (required, max 100 chars).
  - `avatar_url`: Image URL input (optional).
  - `headline`: Text input (optional, max 120 chars).
  - `bio`: Textarea (optional, max 280 chars).
- **Actions:** "Hủy" (Cancel) and "Lưu thay đổi" (Save).
- **Feedback:** Toast message on success / clear validation errors on failure.

### 3.2 ChangePasswordDialog ("Đổi mật khẩu")
- **Fields:**
  - `current_password`: Password input (required).
  - `new_password`: Password input (required, min 8 chars).
  - `new_password_confirmation`: Password confirmation input (required).
- **Validation:** Server-side validation via Laravel Hash check + frontend matching check.
- **Actions:** "Hủy" and "Cập nhật mật khẩu".

---

## 4. Backend API Design

All endpoints reside under `api/v1/profile` with `auth:sanctum` middleware.

### 4.1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/profile/me` | Fetch authenticated user's profile with stats & posts |
| `GET` | `/api/v1/profile/{id}` | Fetch public profile of user `{id}` with stats & posts |
| `PUT` | `/api/v1/profile` | Update user name, avatar, headline, bio |
| `PUT` | `/api/v1/profile/password` | Update user password |

### 4.2 Response Payload (`GET /api/v1/profile/me` & `/api/v1/profile/{id}`)

```json
{
  "user": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "email": "vana@example.com",
    "avatar_url": "https://...",
    "created_at": "2026-10-15T00:00:00Z"
  },
  "community_profile": {
    "username": "nguyenvana",
    "headline": "Sinh viên đam mê kỹ năng mềm",
    "bio": "Học tập và phát triển bản thân mỗi ngày."
  },
  "stats": {
    "presentation_count": 12,
    "average_score": 8.5,
    "practice_duration_minutes": 145,
    "followers_count": 24,
    "following_count": 18
  },
  "achievements": [
    {
      "id": "starter",
      "name": "Bước chân đầu tiên",
      "icon": "flag",
      "unlocked_at": "2026-10-16T10:00:00Z"
    }
  ],
  "posts": [
    {
      "id": 101,
      "content": "Chia sẻ kinh nghiệm làm slide thuyết trình ngắn gọn...",
      "topic": "Thuyết trình",
      "likes_count": 15,
      "replies_count": 3,
      "created_at": "2026-11-10T14:20:00Z"
    }
  ],
  "is_own_profile": true,
  "is_following": false
}
```

*Note: For public profile view (`/api/v1/profile/{id}`), `email` is omitted if `is_own_profile` is false.*

---

## 5. Frontend Architecture

### 5.1 Component Structure
```
frontend/src/features/profile/
├── api/
│   └── useProfile.ts            # React Query hooks: useProfileQuery, useUpdateProfileMutation, useChangePasswordMutation
├── components/
│   ├── ProfileHeaderCard.tsx    # Avatar, info, bio, follow stats, action buttons
│   ├── ProfileStatsCard.tsx     # 3 practice metric cards
│   ├── ProfileAchievements.tsx  # Unlocked badges showcase
│   ├── ProfilePostsList.tsx     # List of authored community posts
│   ├── EditProfileDialog.tsx    # Modal to update name, headline, bio, avatar
│   └── ChangePasswordDialog.tsx # Modal to change password
├── pages/
│   └── ProfilePage.tsx          # Main orchestrator page
└── types/
    └── profile.ts               # TypeScript interfaces
```

### 5.2 Navigation Integration
- Add route `{ path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> }`
- Add route `{ path: '/profile/:id', element: <RequireAuth><ProfilePage /></RequireAuth> }`
- Link "Tài khoản" in `StudentPageLayout.tsx` user dropdown to `/profile`.
- Link author avatars & author names in `CommunityPage` to `/profile/:id`.

---

## 6. Verification & Quality Plan

1. **Backend Tests:**
   - Test `GET /api/v1/profile/me` returns 200 with complete statistics.
   - Test `GET /api/v1/profile/{id}` returns public profile without email.
   - Test `PUT /api/v1/profile` updates name, headline, and bio successfully.
   - Test `PUT /api/v1/profile/password` rejects incorrect current password and accepts valid new password.
2. **Frontend Tests:**
   - Verify `ProfilePage` renders all 4 blocks when loaded.
   - Verify own profile shows Edit & Password buttons.
   - Verify other profile shows Follow/Unfollow button.
   - Verify Edit and Password dialogs open, validate inputs, and submit successfully.
