# Frontend Simplification & Anti-Overengineering Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify overcomplicated frontend code, eliminate dead code and anti-patterns, and align state management with React 19 and TanStack Query v5 standards without breaking existing tests.

**Architecture:** Decompose monolithic components into clean custom hooks, remove ghost components mounted in hidden divs, eliminate dead code from deprecated routes, unify duplicated table JSX, replace fragile recursive cache walkers with canonical TanStack Query invalidation, and connect real backend query hooks instead of hardcoded mock data.

**Tech Stack:** React 19, TypeScript, TanStack React Query v5, Vite, Vitest, Lucide React, Tailwind CSS v4.

---

### Task 1: Remove Hidden Component Anti-pattern in PresentationReviewPage

**Files:**
- Modify: `frontend/src/features/presentation/pages/PresentationReviewPage.tsx:887-897`
- Test: `frontend/src/features/presentation/pages/PresentationReviewPage.test.tsx`

**Interfaces:**
- Consumes: `useSubmitPresentation`, `usePresentationSession` from `../api/presentation-session`
- Produces: Clean `PresentationReviewPage` without mounting hidden `<GradePanel />`

- [ ] **Step 1: Check existing test baseline for PresentationReviewPage**
  Run `npx vitest run src/features/presentation/pages/PresentationReviewPage.test.tsx` in `frontend/`.
- [ ] **Step 2: Replace hidden `<GradePanel>` in `PresentationReviewPage.tsx`**
  Remove the `<div className="hidden"><GradePanel ... /></div>` wrapper and call `useEvaluatePresentation` / `useSubmitPresentation` directly if synchronous evaluation fallback is needed.
- [ ] **Step 3: Run tests to verify zero regression**
  Run `npx vitest run src/features/presentation/pages/PresentationReviewPage.test.tsx` in `frontend/`.

---

### Task 2: Remove Dead Code from Legacy Coach Route and Unused SSE

**Files:**
- Remove: `frontend/src/features/coach/components/AiCoachDrawer.tsx`
- Remove: `frontend/src/features/coach/components/AiCoachDrawer.test.tsx`
- Remove: `frontend/src/core/api/sse.ts`
- Remove: `frontend/src/core/api/sse.test.ts`
- Modify: `frontend/src/features/coach/api/ai.ts` (remove unused `useConversations`, `useConversationMessages`)

- [ ] **Step 1: Verify no active imports exist for `AiCoachDrawer` and `sse.ts`**
  Confirm with ripgrep/powershell that no app routes or components import `AiCoachDrawer` or `sse.ts`.
- [ ] **Step 2: Remove dead files**
  Delete `AiCoachDrawer.tsx`, `AiCoachDrawer.test.tsx`, `sse.ts`, `sse.test.ts`.
- [ ] **Step 3: Clean up unused endpoints in `ai.ts`**
  Remove `useConversations` and `useConversationMessages` from `src/features/coach/api/ai.ts`.
- [ ] **Step 4: Verify typecheck passes**
  Run `npm --prefix frontend run typecheck`.

---

### Task 3: Simplify Network Polling & Deduplicate Tables in PracticeSetupPage

**Files:**
- Modify: `frontend/src/features/presentation/pages/PracticeSetupPage.tsx`
- Test: `frontend/src/features/presentation/pages/PracticeSetupPage.test.tsx`

- [ ] **Step 1: Run existing test baseline for PracticeSetupPage**
  Run `npx vitest run src/features/presentation/pages/PracticeSetupPage.test.tsx`.
- [ ] **Step 2: Simplify network checking**
  Replace the 60-line custom 15-second fetch loop against `/health` with `navigator.onLine` and window online/offline listeners.
- [ ] **Step 3: Unify duplicated table JSX**
  Refactor lines 716-920 into a single unified session row renderer / table structure for server and local fallback sessions.
- [ ] **Step 4: Verify tests pass**
  Run `npx vitest run src/features/presentation/pages/PracticeSetupPage.test.tsx`.

---

### Task 4: Connect Real Backend Queries in AchievementsPage & HomePage

**Files:**
- Modify: `frontend/src/features/community/pages/AchievementsPage.tsx`
- Modify: `frontend/src/features/learning/pages/HomePage.tsx`
- Clean: `frontend/src/features/learning/api/daily-learning.ts`

- [ ] **Step 1: Connect `useLeaderboardQuery` and `useMe` in AchievementsPage**
  Replace hardcoded `'Trương Thanh Sơn'` with authenticated user name, and consume `useLeaderboardQuery()` from `useGamification.ts`.
- [ ] **Step 2: Connect `useStreakQuery` in HomePage**
  Replace localStorage daily-learning calculation with `useStreakQuery()`.
- [ ] **Step 3: Run tests to verify**
  Run `npx vitest run src/features/learning/pages/LessonPage.test.tsx src/features/community/pages/CommunityPage.test.tsx`.

---

### Task 5: Decompose PracticeLivePage Monolith into Focused Custom Hooks

**Files:**
- Create: `frontend/src/features/presentation/hooks/usePresentationMedia.ts`
- Create: `frontend/src/features/presentation/hooks/useMediaPipeTracking.ts`
- Create: `frontend/src/features/presentation/hooks/usePresentationSlides.ts`
- Modify: `frontend/src/features/presentation/pages/PracticeLivePage.tsx`
- Test: `frontend/src/features/presentation/pages/PracticeLivePage.test.tsx`

- [ ] **Step 1: Run existing test baseline for PracticeLivePage**
  Run `npx vitest run src/features/presentation/pages/PracticeLivePage.test.tsx`.
- [ ] **Step 2: Extract `usePresentationMedia`**
  Encapsulate stream acquisition, mic/cam mute toggles, audio analyser node, and MediaRecorder chunks/stopping.
- [ ] **Step 3: Extract `useMediaPipeTracking`**
  Encapsulate FaceLandmarker/PoseLandmarker loading, RAF loop, iris calculation, posture math, and skeleton canvas rendering.
- [ ] **Step 4: Extract `usePresentationSlides`**
  Encapsulate PDF.js loading & canvas rendering, PPTX rendering, and slide notes extraction.
- [ ] **Step 5: Refactor `PracticeLivePage.tsx` to consume hooks**
  Reduce `PracticeLivePage.tsx` line count significantly and keep it as a clean view orchestrator.
- [ ] **Step 6: Run tests to verify**
  Run `npx vitest run src/features/presentation/pages/PracticeLivePage.test.tsx`.

---

### Task 6: Full Verification & Typecheck

- [ ] **Step 1: Run TypeScript typecheck**
  `npm --prefix frontend run typecheck`
- [ ] **Step 2: Run all Vitest test suites**
  `npm --prefix frontend test`
