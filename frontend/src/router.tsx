import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthPage } from './pages/AuthPage';
import { CoachPage } from './pages/CoachPage';
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
    path: '/coach',
    element: (
      <RequireAuth>
        <CoachPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
