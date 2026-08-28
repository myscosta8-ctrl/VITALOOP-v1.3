/**
 * Acesso excepcional / break-glass (Doc 1 §9; Doc 4 §21). Exige motivo e
 * justificativa explícitos; não é atalho de administrador. Toda ativação é
 * auditada no backend (app.activate_break_glass).
 */

import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';

export const BreakGlassPage = (): JSX.Element => {
  const { api } = useSession();
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setState('sending');
    try {
      await api.post('/api/v1/security/break-glass', { reason, justification });
      setState('sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao ativar acesso excepcional.');
      setState('error');
    }
  };

  return (
    <main aria-labelledby="break-glass-heading">
      <h1 id="break-glass-heading">Acesso excepcional (break-glass)</h1>
      <p>
        Use apenas em situação legítima. Esta ação é registrada em auditoria e pode
        ser revisada posteriormente.
      </p>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="bg-reason">Motivo</label>
        <input id="bg-reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
        <label htmlFor="bg-justification">Justificativa</label>
        <textarea
          id="bg-justification"
          required
          minLength={10}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Registrando…' : 'Ativar acesso excepcional'}
        </button>
      </form>
      {state === 'sent' && <p role="status">Acesso excepcional registrado e auditado.</p>}
      {state === 'error' && error && <p role="alert">{error}</p>}
    </main>
  );
};
