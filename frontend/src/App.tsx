import { useState } from 'react';
import { useAuth } from './auth';
import { formatGBP } from './api';
import { LoginPage } from './pages/LoginPage';
import { SimulationPage } from './pages/SimulationPage';
import { UsersPage } from './pages/UsersPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';

type Tab = 'simulation' | 'users' | 'documents' | 'chat';

export function App() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('simulation');

  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <LoginPage />;

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'simulation', label: 'Simulation' },
    { id: 'users', label: 'Test Users', adminOnly: true },
    { id: 'documents', label: 'Documents' },
    { id: 'chat', label: 'AI Assistant' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">AI Banking</div>
        <nav>
          {tabs
            .filter((t) => !t.adminOnly || user.role === 'ADMIN')
            .map((t) => (
              <button key={t.id} className={tab === t.id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <strong>{user.name}</strong> <span className="badge">{user.role}</span>
          </div>
          <div className="muted">Balance {formatGBP(user.balance)}</div>
          <button className="link" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        {tab === 'simulation' && <SimulationPage />}
        {tab === 'users' && user.role === 'ADMIN' && <UsersPage />}
        {tab === 'documents' && <DocumentsPage />}
        {tab === 'chat' && <ChatPage />}
      </main>
    </div>
  );
}
