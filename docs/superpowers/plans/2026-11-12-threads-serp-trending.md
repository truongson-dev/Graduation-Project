# Threads-Style AI Trending Search View (SERP) Implementation Plan

## Goal
Transform the community trending click flow into a 1:1 Threads search results page (`/community?q=...&serp_type=trends&trend_id=...`):
- **Hero Card**: Yellow "Thịnh hành" badge + full AI story summary + post count pill + "Những gì mọi người đang bàn luận, do AI tóm tắt ›".
- **Three Search Tabs**: "Liên quan nhất" (Top/Relevant), "Mới đây" (Latest), "Trang cá nhân" (People/Profiles with instant follow).
- **Quick Composer Box**: User avatar + "Bài viết về {keyword}..." prompt opening the composer pre-filled with context.
- **Robustness**: If `trend_id` expires or is shared, the search fallback still retrieves relevant posts via full-text keyword search and never 404s.

## Proposed Changes

### 1. Backend Search & Hydration
- **`backend/app/Services/Community/CommunityFeedService.php`**:
  - Update `searchPosts(User $viewer, string $query, int $limit = 20, string $filter = 'top')`:
    - When `$filter === 'latest'`: order by `created_at DESC`.
    - When `$filter === 'top'` (default): order by `hot_score DESC`.
  - Add `searchPeople(User $viewer, string $query, int $limit = 20): array`:
    - Search users via `users.name` and `community_profiles.username` / `community_profiles.headline`.
    - Also fetch authors from posts matching the query.
    - Hydrate viewer's `following` status using `fetchFollowingSet($viewer->id, $authorIds)`.
- **`backend/app/Http/Controllers/Api/V1/Community/CommunityFeedController.php`**:
  - In `search()`: support query param `filter` (`top`, `latest`, `people`). If `filter === 'people'`, return array of author items with `viewer.following`.
- **`backend/tests/Feature/Community/CommunityTest.php`**:
  - Add feature tests for search filters: `top`, `latest`, and `people`.

### 2. Frontend API & Types
- **`frontend/src/features/community/types/community.ts`**:
  - Add `CommunityPeopleResult` type: `CommunityAuthor & { viewer: { following: boolean } }`.
- **`frontend/src/features/community/api/communityKeys.ts`**:
  - Update `search: (query: string, filter?: 'top' | 'latest' | 'people') => [...]`.
- **`frontend/src/features/community/api/useCommunityFeed.ts`**:
  - Update `useCommunitySearch(query: string, filter?: 'top' | 'latest' | 'people')`.

### 3. Frontend UI Components & Page
- **`frontend/src/features/community/components/TrendingHeroCard.tsx`**:
  - Card matching Threads screenshot:
    - Yellow highlighted badge `Thịnh hành` inline with summary text or prominent tag.
    - Full summary text.
    - Footer: `{posts_count} bài viết · Những gì mọi người đang bàn luận, do AI tóm tắt ›`.
- **`frontend/src/features/community/components/TrendingQuickComposer.tsx`**:
  - Clean compact bar: Avatar + input placeholder `"Bài viết về {keyword}..."`.
  - Clicking triggers composer dialog.
- **`frontend/src/features/community/pages/CommunityPage.tsx`**:
  - Reads search params: `q`, `serp_type`, `trend_id`.
  - When `serp_type === 'trends'` (or search is active):
    - Renders Back button: `← Quay lại bảng tin`.
    - Renders `TrendingHeroCard` (if `serp_type === 'trends'`).
    - Renders 3 sub-tabs: **Liên quan nhất** (`top`), **Mới đây** (`latest`), **Trang cá nhân** (`people`).
    - Renders `TrendingQuickComposer` (matching topic keyword).
    - If `tab === 'people'`, renders list of authors with Follow button.
    - If `tab === 'top'` or `latest'`, renders `ThreadPostCard` list.
- **`frontend/src/features/community/components/TrendingWidget.tsx`**:
  - Clicking an item sets URL search params `q={keyword}&serp_type=trends&trend_id={trend.id}`.

## Verification Plan
1. Backend feature tests: `php artisan test tests/Feature/Community/CommunityTrendingTest.php tests/Feature/Community/CommunityTest.php`.
2. Frontend unit tests: `npm --prefix frontend test -- src/features/community/components/CommunityComponents.test.tsx src/features/community/pages/CommunityPage.test.tsx`.
3. Frontend typecheck: `npm --prefix frontend run typecheck`.
