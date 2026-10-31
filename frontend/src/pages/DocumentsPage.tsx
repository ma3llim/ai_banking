import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, formatDate } from '../api';
import { Notice, useAction } from '../components/Notice';
import type { BankDocument } from '../types';

export function DocumentsPage() {
  const { notice, busy, run } = useAction();
  const [docs, setDocs] = useState<BankDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => setDocs(await api<BankDocument[]>('/documents')), []);

  useEffect(() => {
    run(load);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('visibility', visibility);
    run(async () => {
      await api('/documents', { form });
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await load();
    }, `${file.name} uploaded and indexed`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Documents</h2>
          <p className="muted">
            Uploads are split into chunks, embedded with Cloudflare AI and stored in pgvector for the assistant to search.
          </p>
        </div>
      </header>

      <Notice notice={notice} />

      <section className="card">
        <h3>Upload document</h3>
        <form className="row wrap" onSubmit={submit}>
          <input ref={fileInput} type="file" accept=".txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'PUBLIC')}>
            <option value="PRIVATE">Private (only me)</option>
            <option value="PUBLIC">Public (all users)</option>
          </select>
          <button className="primary" disabled={busy || !file}>
            {busy ? 'Processing…' : 'Upload'}
          </button>
        </form>
        <p className="muted small">Supported: .txt, .md (max 5 MB)</p>
      </section>

      <section className="card">
        <h3>Documents you can access</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Visibility</th>
                <th>Uploaded by</th>
                <th className="num">Chunks</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.fileName}</td>
                  <td>
                    <span className={d.visibility === 'PUBLIC' ? 'badge ok' : 'badge'}>{d.visibility}</span>
                  </td>
                  <td>{d.uploadedBy.username}</td>
                  <td className="num">{d.metadata?.chunkCount ?? '—'}</td>
                  <td>{formatDate(d.createdAt)}</td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No documents yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
