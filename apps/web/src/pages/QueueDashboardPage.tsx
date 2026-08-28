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
    <div style={{ maxWidth: 1000, margin: '20px auto', padding: 20, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Painel de Gestão e Chamada de Filas (UPA 24h)</h2>
        <div>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Fila Ativa:</label>
          <select
            value={selectedQueueId}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            style={{ padding: 6, borderRadius: 4 }}
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.queueType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: 10, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 15 }}>
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <label style={{ fontWeight: 'bold', marginRight: 10 }}>Local de Chamada / Consultório:</label>
        <input
          type="text"
          value={callRoom}
          onChange={(e) => setCallRoom(e.target.value)}
          placeholder="Ex.: Consultório 01"
          style={{ padding: 6, width: 250, borderRadius: 4, border: '1px solid #ccc' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Carregando fila de espera...</div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, border: '2px dashed #ccc', borderRadius: 6, color: '#666' }}>
          Nenhum paciente aguardando ou em chamada nesta fila no momento.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Senha</th>
              <th style={{ padding: 10 }}>Classificação Manchester</th>
              <th style={{ padding: 10 }}>Score Prioridade</th>
              <th style={{ padding: 10 }}>Estado</th>
              <th style={{ padding: 10 }}>Chamadas</th>
              <th style={{ padding: 10 }}>Ações de Chamamento</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const badge = t.riskColor ? MANCHESTER_BADGE_STYLE[t.riskColor] : null;
              const isProcessing = processingTicketId === t.id;

              return (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: t.isExceeded ? '#fff7ed' : 'transparent' }}>
                  <td style={{ padding: 10, fontWeight: 'bold', fontSize: 16 }}>{t.ticketNumber}</td>
                  <td style={{ padding: 10 }}>
                    {badge ? (
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        {badge.label}
                      </span>
                    ) : (
                      <span style={{ color: '#666', fontSize: 12 }}>Sem Triagem</span>
                    )}
                    {t.isExceeded && (
                      <span style={{ marginLeft: 6, padding: '2px 6px', backgroundColor: '#dc2626', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 'bold' }}>
                        TEMPO EXCEDIDO!
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 10, fontFamily: 'monospace' }}>{t.priorityScore}</td>
                  <td style={{ padding: 10 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                        backgroundColor: t.status === 'called' ? '#fef08a' : t.status === 'in_service' ? '#bbf7d0' : '#e2e8f0',
                        color: t.status === 'called' ? '#854d0e' : t.status === 'in_service' ? '#166534' : '#334155',
                      }}
                    >
                      {t.status === 'called' ? `CHAMADO (${t.callRoom || ''})` : t.status}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{t.callCount}x</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {t.status === 'waiting' && (
                        <button
                          onClick={() => handleCall(t)}
                          disabled={isProcessing}
                          style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                        >
                          Chamar
                        </button>
                      )}
                      {t.status === 'called' && (
                        <>
                          <button
                            onClick={() => handleRecall(t)}
                            disabled={isProcessing}
                            style={{ padding: '4px 10px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Rechamar
                          </button>
                          <button
                            onClick={() => handleStatusChange(t, 'in_service')}
                            disabled={isProcessing}
                            style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Iniciar Atendimento
                          </button>
                          <button
                            onClick={() => handleStatusChange(t, 'absent')}
                            disabled={isProcessing}
                            style={{ padding: '4px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
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
  );
};
