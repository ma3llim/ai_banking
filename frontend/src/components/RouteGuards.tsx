import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { HOME, paths } from '../paths';

export interface LoginRedirectState {
  from?: string;
}

/** Renders child routes only for logged-in users; otherwise sends them to /login and remembers where they were going. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) {
    const state: LoginRedirectState = { from: location.pathname + location.search };
    return <Navigate to={paths.login} replace state={state} />;
  }
  return <Outlet />;
}

/** Admin-only routes; other users are sent home. Use inside RequireAuth. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to={HOME} replace />;
  return <>{children}</>;
}
