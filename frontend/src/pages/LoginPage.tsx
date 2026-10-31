import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Notice, useAction } from '../components/Notice';

const DEMO_LOGINS = [
  { username: 'admin', password: 'admin123' },
  { username: 'alice', password: 'password123' },
  { username: 'bob', password: 'password123' },
];

export function LoginPage() {
  const { login } = useAuth();
  const { notice, busy, run } = useAction();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => login(username, password));
  };

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>AI Banking POC</h1>
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
