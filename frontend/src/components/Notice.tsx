import { useState } from 'react';

export interface NoticeState {
  kind: 'ok' | 'error';
  text: string;
}

export function Notice({ notice }: { notice: NoticeState | null }) {
  if (!notice) return null;
  return <div className={`notice ${notice.kind}`}>{notice.text}</div>;
}

/** Runs an async action, showing a success or error message and a busy flag. */
export function useAction() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, successText?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      if (successText) setNotice({ kind: 'ok', text: successText });
      return true;
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { notice, busy, run };
}
