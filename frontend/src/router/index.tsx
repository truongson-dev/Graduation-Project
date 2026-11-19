import React, { Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router';
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage';
import { AuthPage } from '@/features/auth/pages/AuthPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { useMe } from '@/features/auth/api/auth';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { NotFoundPage } from '@/components/NotFoundPage';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { TopProgressBar } from '@/components/layout/TopProgressBar';

export function PageSkeletonView() {
  const location = useLocation();
  return (
    <StudentPageLayout active={location.pathname}>
      <PageSkeleton />
    </StudentPageLayout>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const me = useMe();

  if (me.isPending) {
    return <PageSkeletonView />;
  }

  if (me.isError || !me.data) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <TopProgressBar />
      {children}
    </>
  );
}

const HomePage = React.lazy(() =>
  import('@/features/learning/pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const LearningPathPage = React.lazy(() =>
  import('@/features/learning/pages/LearningPathPage').then((m) => ({ default: m.LearningPathPage }))
);
const LessonPage = React.lazy(() =>
  import('@/features/learning/pages/LessonPage').then((m) => ({ default: m.LessonPage }))
);
const PracticeSetupPage = React.lazy(() =>
  import('@/features/presentation/pages/PracticeSetupPage').then((m) => ({
    default: m.PracticeSetupPage,
  }))
);
const PracticeLivePage = React.lazy(() =>
  import('@/features/presentation/pages/PracticeLivePage').then((m) => ({
    default: m.PracticeLivePage,
  }))
);
const AchievementsPage = React.lazy(() =>
  import('@/features/community/pages/AchievementsPage').then((m) => ({
    default: m.AchievementsPage,
  }))
);
const CommunityPage = React.lazy(() =>
  import('@/features/community/pages/CommunityPage').then((m) => ({ default: m.CommunityPage }))
);
const ProfilePage = React.lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SettingsPage = React.lazy(() =>
  import('@/features/profile/pages/SettingsPage')
    .then((m) => ({ default: m.SettingsPage || m.default }))
    .catch(() =>
      import('@/features/profile/pages/SettingsPage').then((m) => ({
        default: m.SettingsPage || m.default,
      }))
    )
);
const PresentationReviewPage = React.lazy(() =>
  import('@/features/presentation/pages/PresentationReviewPage').then((m) => ({
    default: m.PresentationReviewPage,
  }))
);

// Admin Pages
const AdminDashboardPage = React.lazy(() =>
  import('@/features/admin/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminUsersPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminLearningPathsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminLearningPathsPage }))
);
const AdminLessonsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminLessonsPage }))
);
const AdminPresentationsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminPresentationsPage }))
);
const AdminFeedbackPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminFeedbackPage }))
);
const AdminAiResultsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminAiResultsPage }))
);
const AdminNotificationsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminNotificationsPage }))
);
const AdminAuditLogsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminAuditLogsPage }))
);
const AdminSettingsPage = React.lazy(() =>
  import('@/features/admin/pages/AdminManagementPages').then((m) => ({ default: m.AdminSettingsPage }))
);

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeletonView />}>{children}</Suspense>;
}

export const routes: RouteObject[] = [
  { path: '/', element: <AuthPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/auth/callback', element: <AuthCallbackPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorBoundary /> },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: '/home',
        element: (
          <LazyView>
            <HomePage />
          </LazyView>
        ),
      },
      {
        path: '/learning-path',
        element: (
          <LazyView>
            <LearningPathPage />
          </LazyView>
        ),
      },
      {
        path: '/learning/lesson/:id',
        element: (
          <LazyView>
            <LessonPage />
          </LazyView>
        ),
      },
      {
        path: '/practice/setup',
        element: (
          <LazyView>
            <PracticeSetupPage />
          </LazyView>
        ),
      },
      {
        path: '/practice/live',
        element: (
          <LazyView>
            <PracticeLivePage />
          </LazyView>
        ),
      },
      {
        path: '/achievements',
        element: (
          <LazyView>
            <AchievementsPage />
          </LazyView>
        ),
      },
      {
        path: '/community',
        element: (
          <LazyView>
            <CommunityPage />
          </LazyView>
        ),
      },
      {
        path: '/profile',
        element: (
          <LazyView>
            <ProfilePage />
          </LazyView>
        ),
      },
      {
        path: '/profile/:id',
        element: (
          <LazyView>
            <ProfilePage />
          </LazyView>
        ),
      },
      {
        path: '/settings',
        element: (
          <LazyView>
            <SettingsPage />
          </LazyView>
        ),
      },
      {
        path: '/practice/review',
        element: (
          <LazyView>
            <PresentationReviewPage />
          </LazyView>
        ),
      },
      {
        path: '/practice/review/:id',
        element: (
          <LazyView>
            <PresentationReviewPage />
          </LazyView>
        ),
      },
      // Admin Management Routes
      {
        path: '/admin',
        element: (
          <LazyView>
            <AdminDashboardPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <LazyView>
            <AdminUsersPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/learning-paths',
        element: (
          <LazyView>
            <AdminLearningPathsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/lessons',
        element: (
          <LazyView>
            <AdminLessonsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/presentations',
        element: (
          <LazyView>
            <AdminPresentationsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/feedback',
        element: (
          <LazyView>
            <AdminFeedbackPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/ai-results',
        element: (
          <LazyView>
            <AdminAiResultsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/notifications',
        element: (
          <LazyView>
            <AdminNotificationsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/audit-logs',
        element: (
          <LazyView>
            <AdminAuditLogsPage />
          </LazyView>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <LazyView>
            <AdminSettingsPage />
          </LazyView>
        ),
      },
    ],
  },
  { path: '/coach', element: <Navigate to="/home" replace /> },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorBoundary /> },
];

export const router = createBrowserRouter(routes);
