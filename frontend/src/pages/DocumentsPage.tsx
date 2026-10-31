import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, formatDate } from '../api';
import { Notice, useAction } from '../components/Notice';
import { AnalysisView } from '../components/AnalysisView';
import type { AnalysisReport, BankDocument } from '../types';

type DocTypeChoice = 'AUTO' | 'GENERAL' | 'STATEMENT';

export function DocumentsPage() {
  const { notice, busy, run } = useAction();
  const analysisAction = useAction();
  const [docs, setDocs] = useState<BankDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [docType, setDocType] = useState<DocTypeChoice>('AUTO');
  const [analysis, setAnalysis] = useState<{ doc: BankDocument; report: AnalysisReport } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => setDocs(await api<BankDocument[]>('/documents')), []);

  useEffect(() => {
    run(load);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = (doc: BankDocument, refresh = false) => {
    setAnalyzingId(doc.id);
    return analysisAction
      .run(async () => {
        const report = await api<AnalysisReport>(`/documents/${doc.id}/analyze${refresh ? '?refresh=true' : ''}`, {
          method: 'POST',
        });
        setAnalysis({ doc, report });
        await load();
        analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .finally(() => setAnalyzingId(null));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('visibility', visibility);
    form.append('docType', docType);
    run(async () => {
      const doc = await api<BankDocument>('/documents', { form });
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await load();
      // Statements are analysed straight away.
      if (doc.docType === 'STATEMENT') void analyze(doc);
    }, `${file.name} uploaded and indexed`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Documents</h2>
          <p className="muted">
            Upload bank documents for the assistant to search. Statements are detected automatically and can be
            analysed for spending insights.
          </p>
        </div>
      </header>

      <Notice notice={notice} />

      <section className="card">
        <h3>Upload document</h3>
        <form className="row wrap" onSubmit={submit}>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <select value={docType} onChange={(e) => setDocType(e.target.value as DocTypeChoice)} aria-label="Document type">
            <option value="AUTO">Type: auto-detect</option>
            <option value="GENERAL">Type: general document</option>
            <option value="STATEMENT">Type: bank statement</option>
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'PUBLIC')} aria-label="Visibility">
            <option value="PRIVATE">Private (only me)</option>
            <option value="PUBLIC">Public (all users)</option>
          </select>
          <button className="primary" disabled={busy || !file}>
            {busy ? 'Processing…' : 'Upload'}
          </button>
        </form>
        <p className="muted small">Supported: .pdf (with selectable text), .txt, .md (max 10 MB)</p>
      </section>

      <section className="card">
        <h3>Documents you can access</h3>
        <Notice notice={analysisAction.notice} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Visibility</th>
                <th>Uploaded by</th>
                <th className="num">Chunks</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.fileName}</td>
                  <td>
                    <span className={d.docType === 'STATEMENT' ? 'badge info' : 'badge'}>
                      {d.docType === 'STATEMENT' ? 'Statement' : 'General'}
                    </span>
                  </td>
                  <td>
                    <span className={d.visibility === 'PUBLIC' ? 'badge ok' : 'badge'}>{d.visibility}</span>
                  </td>
                  <td>{d.uploadedBy.username}</td>
                  <td className="num">{d.metadata?.chunkCount ?? '—'}</td>
                  <td>{formatDate(d.createdAt)}</td>
                  <td className="num">
                    {d.docType === 'STATEMENT' && (
                      <div className="row tight end">
                        <button onClick={() => analyze(d)} disabled={analyzingId !== null}>
                          {analyzingId === d.id ? 'Analysing…' : d.analyzedAt ? 'View analysis' : 'Analyze'}
                        </button>
                        {d.analyzedAt && (
                          <button onClick={() => analyze(d, true)} disabled={analyzingId !== null} title="Run the analysis again">
                            Re-run
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No documents yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div ref={analysisRef}>
        {analysis && (
          <section className="card">
            <div className="section-header">
              <h3>Analysis: {analysis.doc.fileName}</h3>
              <button onClick={() => setAnalysis(null)}>Close</button>
            </div>
            <AnalysisView report={analysis.report} />
          </section>
        )}
      </div>
    </div>
  );
}
