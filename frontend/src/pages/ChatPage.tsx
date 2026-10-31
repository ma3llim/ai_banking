import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { ChatResult, ChatTurn } from '../types';

interface Message extends ChatTurn {
  toolsUsed?: string[];
  sources?: ChatResult['sources'];
  error?: boolean;
}

const SUGGESTIONS = [
  'What is my balance?',
  'Show my last 5 transactions',
  'How much did I spend at Tesco?',
  'What are the fees for using my debit card abroad?',
  'What is my mortgage monthly payment?',
];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    // Only send successful turns back as history (last 10).
    const history: ChatTurn[] = messages.filter((m) => !m.error).slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const result = await api<ChatResult>('/chat', { body: { message, history } });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.answer || '(no answer)', toolsUsed: result.toolsUsed, sources: result.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: err instanceof Error ? err.message : String(err), error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="page chat-page">
      <header className="page-header">
        <div>
          <h2>AI Assistant</h2>
          <p className="muted">Read-only: it can look up your data and documents but cannot make payments.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} disabled={busy}>
            New chat
          </button>
        )}
      </header>

      <div className="chat-log card">
        {messages.length === 0 && (
          <div className="suggestions">
            <p className="muted">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
            <div className="bubble-text">{m.content}</div>
            {(m.toolsUsed?.length || m.sources?.length) ? (
              <div className="bubble-meta">
                {m.toolsUsed?.length ? <span>Tools: {[...new Set(m.toolsUsed)].join(', ')}</span> : null}
                {m.sources?.length ? <span>Sources: {m.sources.map((s) => s.fileName).join(', ')}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">Thinking…</div>}
        <div ref={bottom} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input placeholder="Ask about your account, transactions or bank policies…" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <button className="primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
