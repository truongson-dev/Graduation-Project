# Frontend Clean Architecture (Bulletproof React) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up and standardize the frontend codebase according to international industry standards (Bulletproof React / Feature-Based Clean Architecture) while keeping 100% of existing tests (61 tests) and TypeScript typechecks passing without regression.

**Architecture:** Vertical-slice Feature-Based Clean Architecture:
1. `src/core/`: Foundation infrastructure (HTTP client, SSE, tokens, env, core utils).
2. `src/components/ui/` & `src/components/layout/`: Shared design system components & application shells.
3. `src/features/{auth, presentation, coach, learning, community}/`: Modular business domain slices containing dedicated `api/`, `components/`, `pages/`, `types/`, and tests.
4. `src/router/`: Dedicated routing definition and auth guards.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4, TanStack Query v5, Vitest 5, React Router v8.

---

### Task 1: Establish `src/core/` Foundation Layer
**Files:**
- Create: `frontend/src/core/config/env.ts`
- Create: `frontend/src/core/api/client.ts`
- Create: `frontend/src/core/api/sse.ts`
- Create: `frontend/src/core/auth/token.ts`
- Create: `frontend/src/core/utils/cn.ts`
- Create: `frontend/src/core/utils/password.ts`
- Update: `frontend/src/lib/` files to re-export from `src/core/` for backward compatibility
- Tests: `frontend/src/core/api/client.test.ts`, `frontend/src/core/api/sse.test.ts`, `frontend/src/core/auth/token.test.ts`

- [ ] **Step 1: Move and standardize core infrastructure files**
- [ ] **Step 2: Update re-exports in `frontend/src/lib/` for backwards compatibility**
- [ ] **Step 3: Run Vitest on core tests to verify 100% pass**

---

### Task 2: Standardize Shared Layout & Primitives Layer
**Files:**
- Create: `frontend/src/components/layout/StudentPageLayout.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/UserAvatar.tsx`
- Create: `frontend/src/components/layout/BrandMark.tsx`
- Create: `frontend/src/components/layout/AppIcon.tsx`
- Create: `frontend/src/components/layout/GoogleIcon.tsx`
- Create: `frontend/src/components/layout/HelpModal.tsx`
- Tests: `frontend/src/components/layout/StudentPageLayout.test.tsx`, `frontend/src/components/layout/UserAvatar.test.tsx`

- [ ] **Step 1: Reorganize shared layout components from `src/components/Common/` and loose files into `src/components/layout/`**
- [ ] **Step 2: Provide backward-compatible re-exports in `src/components/Common/`**
- [ ] **Step 3: Run Vitest layout tests to verify 100% pass**

---

### Task 3: Structure Features: Auth & Coach
**Files:**
- Create: `frontend/src/features/auth/api/auth.ts`, `frontend/src/features/auth/types/auth.ts`
- Create: `frontend/src/features/auth/components/{AuthForm, AuthTabs, BrandFeaturePanel, FastAuthButtons, ForgotPasswordForm, InputField}.tsx`
- Create: `frontend/src/features/auth/pages/{AuthPage, AuthCallbackPage, ResetPasswordPage}.tsx`
- Create: `frontend/src/features/coach/api/ai.ts`
- Create: `frontend/src/features/coach/components/{GradePanel, AiCoachDrawer}.tsx`
- Tests: `frontend/src/features/auth/api/auth.test.ts`, `frontend/src/features/coach/components/GradePanel.test.tsx`, `frontend/src/features/coach/components/AiCoachDrawer.test.tsx`

- [ ] **Step 1: Migrate auth components, pages, api & types to `src/features/auth/`**
- [ ] **Step 2: Migrate coach components & AI evaluation to `src/features/coach/`**
- [ ] **Step 3: Maintain re-exports in legacy paths (`src/lib/auth.ts`, `src/pages/Auth*.tsx`, etc.)**
- [ ] **Step 4: Run Vitest to verify all auth and coach tests pass**

---

### Task 4: Structure Features: Presentation, Learning & Community
**Files:**
- Create: `frontend/src/features/presentation/` (pages: Setup, Live, Review; components: RadarChart, WaveformPlayer, MeetingBottomDock, MeetingTopBar, SpeakerTile; api: session, history, slide logic)
- Create: `frontend/src/features/learning/` (pages: HomePage, LearningPathPage; api: daily-learning, learning-lives)
- Create: `frontend/src/features/community/` (pages: CommunityPage, AchievementsPage; api: tournament)
- Tests: `Slide.test.ts`, `PracticeLivePage.test.tsx`, `PracticeSetupPage.test.tsx`, `PresentationReviewPage.test.tsx`, `PresentationWaveformPlayer.test.tsx`

- [ ] **Step 1: Migrate presentation pages, components, slide parsing & tests into `src/features/presentation/`**
- [ ] **Step 2: Migrate learning pages & hooks into `src/features/learning/`**
- [ ] **Step 3: Migrate community pages & tournament hooks into `src/features/community/`**
- [ ] **Step 4: Maintain re-exports in legacy paths**
- [ ] **Step 5: Run Vitest to verify all presentation & learning tests pass**

---

### Task 5: Centralize Router & Clean Up Codebase
**Files:**
- Create: `frontend/src/router/index.tsx`, `frontend/src/router/index.test.tsx`
- Update: `frontend/src/router.tsx` and `frontend/src/main.tsx` to point cleanly to the new structure
- Clean up unused files, organize imports, verify path aliases (`@/*`)

- [ ] **Step 1: Standardize router under `src/router/`**
- [ ] **Step 2: Run full Vitest suite (all 61 tests) and TypeScript typecheck (`tsc --noEmit`)**
- [ ] **Step 3: Run production build (`vite build`) to guarantee clean build artifacts**
