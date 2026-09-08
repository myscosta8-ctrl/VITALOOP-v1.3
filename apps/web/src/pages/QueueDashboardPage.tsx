import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createQueuesApi,
  type ManchesterRiskColor,
  type Queue,
  type QueueTicket,
} from '../lib/queues-api.js';

export const MANCHESTER_BADGE_STYLE: Record<ManchesterRiskColor, { label: string; bg: string; text: string }> = {
  red: { label: 'Vermelho (Emergência)', bg: '#ef4444', text: '#ffffff' },
  orange: { label: 'Laranja (Muito Urgente)', bg: '#f97316', text: '#ffffff' },
  yellow: { label: 'Amarelo (Urgente)', bg: '#eab308', text: '#000000' },
  green: { label: 'Verde (Pouco Urgente)', bg: '#22c55e', text: '#ffffff' },
  blue: { label: 'Azul (Não Urgente)', bg: '#3b82f6', text: '#ffffff' },
};

export const QueueDashboardPage: React.FC = () => {
  const { api } = useSession();
  const queuesApi = createQueuesApi(api);

  const [queues, setQueues] = useState<readonly Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [tickets, setTickets] = useState<readonly QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [callRoom, setCallRoom] = useState('Consultório 01');
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);

  const fetchQueues = useCallback(async () => {
    try {
      const data = await queuesApi.listQueues();
      const list = Array.isArray(data) ? data : [];
      setQueues(list);
      if (list.length > 0 && !selectedQueueId) {
        setSelectedQueueId(list[0]!.id);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar filas.';
      setErrorMessage(msg);
    }
  }, [api, selectedQueueId]);

  const fetchTickets = useCallback(async () => {
    if (!selectedQueueId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await queuesApi.listTickets(selectedQueueId);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar senhas da fila.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [api, selectedQueueId]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCall = async (ticket: QueueTicket) => {
    if (!callRoom.trim()) {
      setErrorMessage('Informe o consultório/local de atendimento.');
      return;
    }

    setProcessingTicketId(ticket.id);
    setErrorMessage(null);
    try {
      await queuesApi.callTicket(ticket.id, { callRoom: callRoom.trim() });
      await fetchTickets();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao chamar paciente.';
      setErrorMessage(msg);
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleRecall = async (ticket: QueueTicket) => {
    setProcessingTicketId(ticket.id);
    setErrorMessage(null);
    try {
      await queuesApi.recallTicket(ticket.id);
      await fetchTickets();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao rechamar paciente.';
      setErrorMessage(msg);
    } finally {
      setProcessingTicketId(null);
    }
  };

  const handleStatusChange = async (ticket: QueueTicket, status: 'in_service' | 'absent') => {
    setProcessingTicketId(ticket.id);
    setErrorMessage(null);
    try {
      await queuesApi.updateStatus(ticket.id, { status });
      await fetchTickets();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao atualizar status do ticket.';
      setErrorMessage(msg);
    } finally {
      setProcessingTicketId(null);
    }
  };

  return (
    <main aria-labelledby="queue-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="queue-heading">Painel de Gestão e Chamada de Filas (UPA 24h)</h1>
          <p>Priorização por classificação de risco Manchester</p>
        </div>
        <div className="vl-field-inline">
          <label htmlFor="queue-select">Fila Ativa:</label>
          <select id="queue-select" value={selectedQueueId} onChange={(e) => setSelectedQueueId(e.target.value)}>
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.queueType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && <div role="alert">{errorMessage}</div>}

      <div className="vl-panel">
        <div className="vl-panel-head">
          <div className="vl-field-inline">
            <label htmlFor="call-room">Local de Chamada / Consultório:</label>
            <input
              id="call-room"
              type="text"
              value={callRoom}
              onChange={(e) => setCallRoom(e.target.value)}
              placeholder="Ex.: Consultório 01"
            />
          </div>
        </div>

        {loading ? (
          <p role="status" className="vl-panel-body">Carregando fila de espera...</p>
        ) : tickets.length === 0 ? (
          <p role="status" className="vl-panel-body">Nenhum paciente aguardando ou em chamada nesta fila no momento.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Senha</th>
                <th>Classificação Manchester</th>
                <th>Score Prioridade</th>
                <th>Estado</th>
                <th>Chamadas</th>
                <th>Ações de Chamamento</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const badge = t.riskColor ? MANCHESTER_BADGE_STYLE[t.riskColor] : null;
                const isProcessing = processingTicketId === t.id;
                const statusBadgeClass =
                  t.status === 'called' ? 'vl-badge-warning' : t.status === 'in_service' ? 'vl-badge-success' : 'vl-badge-neutral';

                return (
                  <tr key={t.id} className={t.isExceeded ? 'vl-row-exceeded' : undefined}>
                    <td className="vl-mono vl-ticket">{t.ticketNumber}</td>
                    <td>
                      {badge ? (
                        <span
                          className="vl-badge"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                      ) : (
                        <span className="vl-badge vl-badge-neutral">Sem Triagem</span>
                      )}
                      {t.isExceeded && <span className="vl-badge vl-badge-danger" style={{ marginLeft: 6 }}>TEMPO EXCEDIDO!</span>}
                    </td>
                    <td className="vl-mono">{t.priorityScore}</td>
                    <td>
                      <span className={`vl-badge ${statusBadgeClass}`}>
                        {t.status === 'called' ? `CHAMADO (${t.callRoom || ''})` : t.status}
                      </span>
                    </td>
                    <td>{t.callCount}x</td>
                    <td>
                      <div className="vl-row-actions">
                        {t.status === 'waiting' && (
                          <button className="vl-btn-sm" onClick={() => handleCall(t)} disabled={isProcessing}>
                            Chamar
                          </button>
                        )}
                        {t.status === 'called' && (
                          <>
                            <button className="vl-btn-sm vl-btn-warning" onClick={() => handleRecall(t)} disabled={isProcessing}>
                              Rechamar
                            </button>
                            <button
                              className="vl-btn-sm vl-btn-success"
                              onClick={() => handleStatusChange(t, 'in_service')}
                              disabled={isProcessing}
                            >
                              Iniciar Atendimento
                            </button>
                            <button
                              className="vl-btn-sm vl-btn-danger"
                              onClick={() => handleStatusChange(t, 'absent')}
                              disabled={isProcessing}
                            >
                              Ausente
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
};
