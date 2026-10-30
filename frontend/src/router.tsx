import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthPage } from './pages/AuthPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { CommunityPage } from './pages/CommunityPage';
import { HomePage } from './pages/HomePage';
import { LearningPathPage } from './pages/LearningPathPage';
import { PresentationReviewPage } from './pages/PresentationReviewPage';
import { PracticeSetupPage } from './pages/PracticeSetupPage';
import { PracticeLivePage } from './pages/PracticeLivePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { readToken } from './lib/token';
import { useMe } from './lib/auth';

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

  if (!readToken()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (me.isPending) {
    return <LoadingScreen />;
  }

  if (me.isError) {
    return <Navigate to="/" replace />;
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
    path: '/learning-path',
    element: (
      <RequireAuth>
        <LearningPathPage />
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
  { path: '/coach', element: <Navigate to="/home" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
