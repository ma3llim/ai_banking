import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, formatGBP } from '../api';
import { Notice, useAction } from '../components/Notice';
import type { User } from '../types';

const emptyForm = { username: '', password: 'password123', name: '', email: '', role: 'USER', initialBalance: '1000' };

export function UsersPage() {
  const { notice, busy, run } = useAction();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => setUsers(await api<User[]>('/users')), []);

  useEffect(() => {
    run(load);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api('/users', { body: { ...form, initialBalance: Number(form.initialBalance || 0) } });
      setForm(emptyForm);
      await load();
    }, `User ${form.username} created`);
  };

  const fillRandom = () => {
    const n = Math.floor(Math.random() * 9000) + 1000;
    setForm({ ...emptyForm, username: `test${n}`, name: `Test User ${n}`, email: `test${n}@demobank.test` });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Test Users</h2>
          <p className="muted">Create dummy customers to test with.</p>
        </div>
      </header>

      <Notice notice={notice} />

      <div className="grid two">
        <section className="card">
          <h3>Create user</h3>
          <form className="form" onSubmit={submit}>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <div className="row">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              <input placeholder="Opening balance (£)" type="number" min="0" step="0.01" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} />
            </div>
            <div className="row">
              <button type="button" onClick={fillRandom}>
                Fill random
              </button>
              <button className="primary" disabled={busy}>
                Create user
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h3>All users</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className="badge">{u.role}</span>
                    </td>
                    <td className="num">{formatGBP(u.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
