import { useEffect } from 'react';
import { NavLink, Outlet, useMatches, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { formatGBP } from '../api';
import { paths } from '../paths';

const NAV_ITEMS: { to: string; label: string; adminOnly?: boolean }[] = [
  { to: paths.simulation, label: 'Simulation' },
  { to: paths.users, label: 'Test Users', adminOnly: true },
  { to: paths.documents, label: 'Documents' },
  { to: paths.chat, label: 'AI Assistant' },
];

export interface RouteHandle {
  title?: string;
}

/** Sets the browser tab title from the deepest route's `handle.title`. */
function useRouteTitle() {
  const matches = useMatches();
  const title = [...matches].reverse().map((m) => (m.handle as RouteHandle | undefined)?.title).find(Boolean);
  useEffect(() => {
    document.title = title ? `${title} · AI Banking` : 'AI Banking';
  }, [title]);
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useRouteTitle();

  // RequireAuth guarantees a user here.
  if (!user) return null;

  const signOut = () => {
    logout();
    navigate(paths.login, { replace: true });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">AI Banking</div>
        <nav>
          {NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'ADMIN').map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <strong>{user.name}</strong> <span className="badge">{user.role}</span>
          </div>
          <div className="muted">Balance {formatGBP(user.balance)}</div>
          <button className="link" onClick={signOut}>
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
