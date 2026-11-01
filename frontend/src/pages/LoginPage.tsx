import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Notice, useAction } from '../components/Notice';
import type { LoginRedirectState } from '../components/RouteGuards';
import { HOME, paths } from '../paths';

const DEMO_LOGINS = [
  { username: 'admin', password: 'admin123' },
  { username: 'alice', password: 'password123' },
  { username: 'bob', password: 'password123' },
];

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const { notice, busy, run } = useAction();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (loading) return <div className="center muted">Loading…</div>;
  // Once signed in (or if already signed in), go back to the page that was requested.
  if (user) {
    const from = (location.state as LoginRedirectState | null)?.from;
    return <Navigate to={from && from !== paths.login ? from : HOME} replace />;
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => login(username, password));
  };

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>AI Banking</h1>
        <p className="muted">Demo environment — dummy data only.</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="primary" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Notice notice={notice} />
        <div className="demo-logins">
          <span className="muted">Quick login:</span>
          {DEMO_LOGINS.map((d) => (
            <button type="button" key={d.username} onClick={() => run(() => login(d.username, d.password))}>
              {d.username}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
