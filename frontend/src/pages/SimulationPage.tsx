import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, formatDate, formatGBP } from '../api';
import { useAuth } from '../auth';
import { Notice, useAction } from '../components/Notice';
import { AnalysisView } from '../components/AnalysisView';
import type { AnalysisReport, Card, Transaction, Transfer, User } from '../types';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const DEMO_PURCHASES = [
  { merchant: 'Tesco', description: 'Groceries', min: 8, max: 80 },
  { merchant: 'Pret A Manger', description: 'Lunch', min: 4, max: 15 },
  { merchant: 'TfL', description: 'Travel', min: 2, max: 12 },
  { merchant: 'Amazon UK', description: 'Online order', min: 10, max: 150 },
  { merchant: "Sainsbury's", description: 'Groceries', min: 8, max: 70 },
  { merchant: 'Boots', description: 'Pharmacy', min: 3, max: 40 },
];

export function SimulationPage() {
  const { user: me, refresh } = useAuth();
  const isAdmin = me!.role === 'ADMIN';
  const { notice, busy, run } = useAction();
  const analysisAction = useAction();
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(me!.id);
  const [profile, setProfile] = useState<User | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [newCardType, setNewCardType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [txn, setTxn] = useState({ cardId: '', type: 'DEBIT', amount: '', description: '', merchant: '' });
  const [payTo, setPayTo] = useState({ toUsername: '', amount: '', description: '' });

  const load = useCallback(async () => {
    const q = `userId=${selectedUserId}`;
    const [p, c, t, tr] = await Promise.all([
      api<User>(`/users/${selectedUserId}`),
      api<Card[]>(`/cards?${q}`),
      api<Transaction[]>(`/transactions?${q}&limit=25`),
      api<Transfer[]>(`/transfers?${q}`),
    ]);
    setProfile(p);
    setCards(c);
    setTransactions(t);
    setTransfers(tr);
    setTxn((prev) => ({ ...prev, cardId: c.some((card) => String(card.id) === prev.cardId) ? prev.cardId : String(c[0]?.id ?? '') }));
  }, [selectedUserId]);

  useEffect(() => {
    run(load);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // An analysis belongs to one user and month; clear it when either changes.
  useEffect(() => setReport(null), [selectedUserId, month]);

  const analyze = () =>
    analysisAction.run(async () => {
      setReport(await api<AnalysisReport>(`/analysis/monthly?userId=${selectedUserId}&month=${month}`));
    });

  useEffect(() => {
    if (isAdmin) api<User[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, [isAdmin]);

  const afterChange = async () => {
    await load();
    await refresh();
  };

  const createCard = () =>
    run(async () => {
      await api('/cards', { body: { userId: selectedUserId, cardType: newCardType } });
      await load();
    }, 'Card created');

  const submitTransaction = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api('/transactions', {
        body: { ...txn, cardId: Number(txn.cardId), amount: Number(txn.amount), merchant: txn.merchant || undefined },
      });
      setTxn((prev) => ({ ...prev, amount: '', description: '', merchant: '' }));
      await afterChange();
    }, 'Transaction recorded');
  };

  const simulatePurchase = () => {
    const card = cards.find((c) => c.status === 'ACTIVE');
    if (!card) return run(async () => Promise.reject(new Error('Create a card first')));
    const p = DEMO_PURCHASES[Math.floor(Math.random() * DEMO_PURCHASES.length)];
    const amount = Math.round((p.min + Math.random() * (p.max - p.min)) * 100) / 100;
    return run(async () => {
      await api('/transactions', {
        body: { cardId: card.id, type: 'DEBIT', amount, description: p.description, merchant: p.merchant },
      });
      await afterChange();
    }, `Simulated ${formatGBP(amount)} at ${p.merchant}`);
  };

  const submitPayTo = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api('/transfers', { body: { ...payTo, amount: Number(payTo.amount), description: payTo.description || undefined } });
      setPayTo({ toUsername: '', amount: '', description: '' });
      await afterChange();
    }, 'Payment sent');
  };

  const viewingSelf = selectedUserId === me!.id;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Simulation</h2>
          <p className="muted">Create cards, simulate card payments, pay other users and analyse monthly spending. All data is dummy.</p>
        </div>
        {isAdmin && (
          <label className="inline">
            Acting on
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <Notice notice={notice} />

      <section className="stats">
        <div className="stat">
          <span className="muted">Customer</span>
          <strong>{profile?.name ?? '—'}</strong>
        </div>
        <div className="stat">
          <span className="muted">Balance</span>
          <strong>{profile ? formatGBP(profile.balance) : '—'}</strong>
        </div>
        <div className="stat">
          <span className="muted">Cards</span>
          <strong>{cards.length}</strong>
        </div>
        <button className="primary" onClick={simulatePurchase} disabled={busy}>
          Simulate random purchase
        </button>
      </section>

      <div className="grid">
        <section className="card">
          <h3>Cards</h3>
          <ul className="list">
            {cards.map((c) => (
              <li key={c.id}>
                <span className="mono">•••• {c.cardNumber.slice(-4)}</span>
                <span className="badge">{c.cardType}</span>
                <span className={c.status === 'ACTIVE' ? 'badge ok' : 'badge error'}>{c.status}</span>
              </li>
            ))}
            {cards.length === 0 && <li className="muted">No cards yet</li>}
          </ul>
          <div className="row">
            <select value={newCardType} onChange={(e) => setNewCardType(e.target.value as 'DEBIT' | 'CREDIT')}>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
            <button onClick={createCard} disabled={busy}>
              Create card
            </button>
          </div>
        </section>

        <section className="card">
          <h3>Card transaction</h3>
          <form className="form" onSubmit={submitTransaction}>
            <div className="row">
              <select value={txn.cardId} onChange={(e) => setTxn({ ...txn, cardId: e.target.value })} required>
                <option value="">Select card</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    •••• {c.cardNumber.slice(-4)} ({c.cardType})
                  </option>
                ))}
              </select>
              <select value={txn.type} onChange={(e) => setTxn({ ...txn, type: e.target.value })}>
                <option value="DEBIT">Debit (payment)</option>
                <option value="CREDIT">Credit (refund)</option>
              </select>
            </div>
            <input placeholder="Amount (£)" type="number" min="0.01" step="0.01" value={txn.amount} onChange={(e) => setTxn({ ...txn, amount: e.target.value })} required />
            <input placeholder="Description" value={txn.description} onChange={(e) => setTxn({ ...txn, description: e.target.value })} required />
            <input placeholder="Merchant (optional)" value={txn.merchant} onChange={(e) => setTxn({ ...txn, merchant: e.target.value })} />
            <button className="primary" disabled={busy}>
              Record transaction
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Pay to</h3>
          {viewingSelf ? (
            <form className="form" onSubmit={submitPayTo}>
              <input placeholder="Recipient username (e.g. bob)" value={payTo.toUsername} onChange={(e) => setPayTo({ ...payTo, toUsername: e.target.value })} required />
              <input placeholder="Amount (£)" type="number" min="0.01" step="0.01" value={payTo.amount} onChange={(e) => setPayTo({ ...payTo, amount: e.target.value })} required />
              <input placeholder="Reference (optional)" value={payTo.description} onChange={(e) => setPayTo({ ...payTo, description: e.target.value })} />
              <button className="primary" disabled={busy}>
                Send money
              </button>
            </form>
          ) : (
            <p className="muted">Payments are sent from your own account. Switch "Acting on" back to yourself.</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section-header">
          <h3>Recent transactions</h3>
          <div className="row tight">
            <input
              type="month"
              aria-label="Month to analyse"
              value={month}
              max={currentMonth()}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
            />
            <button className="primary" onClick={analyze} disabled={analysisAction.busy}>
              {analysisAction.busy ? 'Analysing…' : 'Analyze month'}
            </button>
          </div>
        </div>
        <Notice notice={analysisAction.notice} />
        {report && <AnalysisView report={report} />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Merchant</th>
                <th>Card</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>{t.description}</td>
                  <td>{t.merchant ?? '—'}</td>
                  <td className="mono">{t.cardId ? `•••• ${cards.find((c) => c.id === t.cardId)?.cardNumber.slice(-4) ?? t.cardId}` : 'Transfer'}</td>
                  <td className={t.type === 'CREDIT' ? 'num credit' : 'num'}>
                    {t.type === 'CREDIT' ? '+' : '−'}
                    {formatGBP(t.amount)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Transfers</h3>
        <ul className="list">
          {transfers.map((t) => {
            const outgoing = t.fromUserId === selectedUserId;
            return (
              <li key={t.id}>
                <span>{formatDate(t.createdAt)}</span>
                <span>{outgoing ? `To ${t.toUser.name}` : `From ${t.fromUser.name}`}</span>
                <span className="muted">{t.description ?? ''}</span>
                <strong className={outgoing ? '' : 'credit'}>
                  {outgoing ? '−' : '+'}
                  {formatGBP(t.amount)}
                </strong>
              </li>
            );
          })}
          {transfers.length === 0 && <li className="muted">No transfers yet</li>}
        </ul>
      </section>
    </div>
  );
}
