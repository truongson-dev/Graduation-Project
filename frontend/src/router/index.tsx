import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { AuthPage } from '@/features/auth/pages/AuthPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { AchievementsPage } from '@/features/community/pages/AchievementsPage';
import { CommunityPage } from '@/features/community/pages/CommunityPage';
import { HomePage } from '@/features/learning/pages/HomePage';
import { LearningPathPage } from '@/features/learning/pages/LearningPathPage';
import { LessonPage } from '@/features/learning/pages/LessonPage';
import { PresentationReviewPage } from '@/features/presentation/pages/PresentationReviewPage';
import { PracticeSetupPage } from '@/features/presentation/pages/PracticeSetupPage';
import { PracticeLivePage } from '@/features/presentation/pages/PracticeLivePage';
import { useMe } from '@/features/auth/api/auth';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { AdminAiResultsPage, AdminAuditLogsPage, AdminFeedbackPage, AdminLearningPathsPage, AdminLessonsPage, AdminNotificationsPage, AdminPresentationsPage, AdminSettingsPage, AdminUsersPage } from '@/features/admin/pages/AdminManagementPages';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <span className="material-symbols-outlined text-[32px] text-[#1a365d] animate-spin">
        progress_activity
      </span>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const me = useMe();

  if (me.isPending) {
    return <LoadingScreen />;
  }

  if (me.isError || !me.data) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export const routes: RouteObject[] = [
  { path: '/', element: <AuthPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/home',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminDashboardPage />
      </RequireAuth>
    ),
  },
  { path: '/admin/users', element: <RequireAuth><AdminUsersPage /></RequireAuth> },
  { path: '/admin/learning-paths', element: <RequireAuth><AdminLearningPathsPage /></RequireAuth> },
  { path: '/admin/lessons', element: <RequireAuth><AdminLessonsPage /></RequireAuth> },
  { path: '/admin/presentations', element: <RequireAuth><AdminPresentationsPage /></RequireAuth> },
  { path: '/admin/ai-results', element: <RequireAuth><AdminAiResultsPage /></RequireAuth> },
  { path: '/admin/feedback', element: <RequireAuth><AdminFeedbackPage /></RequireAuth> },
  { path: '/admin/notifications', element: <RequireAuth><AdminNotificationsPage /></RequireAuth> },
  { path: '/admin/audit-logs', element: <RequireAuth><AdminAuditLogsPage /></RequireAuth> },
  { path: '/admin/settings', element: <RequireAuth><AdminSettingsPage /></RequireAuth> },
  {
    path: '/admin/*',
    element: (
      <RequireAuth>
        <AdminDashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/learning-path',
    element: (
      <RequireAuth>
        <LearningPathPage />
      </RequireAuth>
    ),
  },
  {
    path: '/lesson',
    element: (
      <RequireAuth>
        <LessonPage />
      </RequireAuth>
    ),
  },
  {
    path: '/practice/setup',
    element: (
      <RequireAuth>
        <PracticeSetupPage />
      </RequireAuth>
    ),
  },
  {
    path: '/practice/live',
    element: (
      <RequireAuth>
        <PracticeLivePage />
      </RequireAuth>
    ),
  },
  {
    path: '/achievements',
    element: (
      <RequireAuth>
        <AchievementsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/community',
    element: (
      <RequireAuth>
        <CommunityPage />
      </RequireAuth>
    ),
  },
  {
    path: '/practice/review',
    element: (
      <RequireAuth>
        <PresentationReviewPage />
      </RequireAuth>
    ),
  },
  {
    path: '/practice/review/:id',
    element: (
      <RequireAuth>
        <PresentationReviewPage />
      </RequireAuth>
    ),
  },
  { path: '/coach', element: <Navigate to="/home" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
