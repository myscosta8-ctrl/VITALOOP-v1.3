/**
 * Acesso excepcional / break-glass (Doc 1 §9; Doc 4 §21). Exige motivo e
 * justificativa explícitos; não é atalho de administrador. Toda ativação é
 * auditada no backend (app.activate_break_glass).
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createSecurityApi, type BreakGlassAccessRecord } from '../lib/security-api.js';

// Papéis que podem revisar ativações de break-glass (migration 0067 —
// decisão institucional: admin/direcao/system_admin). Checagem aqui é só
// de UX (esconder a seção pra quem não revisa); a API reforça de verdade
// via permissão break_glass.review.
const REVIEWER_ROLES = ['admin', 'direcao', 'system_admin'];

const BreakGlassReviewSection = (): JSX.Element => {
  const { api } = useSession();
  const securityApi = createSecurityApi(api);
  const [records, setRecords] = useState<BreakGlassAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await securityApi.listBreakGlassAccess());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao carregar ativações de break-glass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleReview = async (id: string): Promise<void> => {
    setReviewingId(id);
    try {
      await securityApi.reviewBreakGlassAccess(id, notesDraft[id]?.trim() || undefined);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao revisar ativação.');
    } finally {
      setReviewingId(null);
    }
  };

  const pending = records.filter((r) => !r.reviewedAt);
  const reviewed = records.filter((r) => r.reviewedAt);

  return (
    <section aria-labelledby="bg-review-heading" style={{ marginTop: 32 }}>
      <h2 id="bg-review-heading">Revisão de acessos excepcionais</h2>
      {loading && <p role="status">Carregando…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (
        <>
          <h3>Pendentes de revisão ({pending.length})</h3>
          {pending.length === 0 ? (
            <p role="status">Nenhuma ativação pendente de revisão.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Quem ativou</th>
                  <th>Motivo</th>
                  <th>Justificativa</th>
                  <th>Ativado em</th>
                  <th>Expira em</th>
                  <th>Observação da revisão</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.reason}</td>
                    <td>{r.justification}</td>
                    <td>{new Date(r.grantedAt).toLocaleString('pt-BR')}</td>
                    <td>{r.expiresAt ? new Date(r.expiresAt).toLocaleString('pt-BR') : '—'}</td>
                    <td>
                      <input
                        aria-label={`Observação da revisão para ativação de ${r.userName}`}
                        value={notesDraft[r.id] ?? ''}
                        onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={reviewingId === r.id}
                        onClick={() => void handleReview(r.id)}
                      >
                        {reviewingId === r.id ? 'Revisando…' : 'Marcar como revisado'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>Já revisadas ({reviewed.length})</h3>
          {reviewed.length === 0 ? (
            <p role="status">Nenhuma ativação revisada ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Quem ativou</th>
                  <th>Motivo</th>
                  <th>Revisado por</th>
                  <th>Revisado em</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.reason}</td>
                    <td>{r.reviewedByName}</td>
                    <td>{new Date(r.reviewedAt!).toLocaleString('pt-BR')}</td>
                    <td>{r.reviewNotes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
};

export const BreakGlassPage = (): JSX.Element => {
  const { api, identity } = useSession();
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const canReview = REVIEWER_ROLES.some((role) => identity?.roles.includes(role));

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

      {canReview && <BreakGlassReviewSection />}
    </main>
  );
};
