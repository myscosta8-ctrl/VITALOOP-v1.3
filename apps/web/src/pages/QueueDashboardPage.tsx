import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createQueuesApi,
  type ManchesterRiskColor,
  type Queue,
  type QueueTicket,
} from '../lib/queues-api.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

// Valores canônicos (--triage-*) vivem em global.css, fora do tema visual
// genérico de propósito — ver nota lá. Este objeto só referencia os tokens.
export const MANCHESTER_BADGE_STYLE: Record<ManchesterRiskColor, { label: string; bg: string; text: string }> = {
  red: { label: 'Vermelho (Emergência)', bg: 'var(--triage-red-bg)', text: 'var(--triage-red-text)' },
  orange: { label: 'Laranja (Muito Urgente)', bg: 'var(--triage-orange-bg)', text: 'var(--triage-orange-text)' },
  yellow: { label: 'Amarelo (Urgente)', bg: 'var(--triage-yellow-bg)', text: 'var(--triage-yellow-text)' },
  green: { label: 'Verde (Pouco Urgente)', bg: 'var(--triage-green-bg)', text: 'var(--triage-green-text)' },
  blue: { label: 'Azul (Não Urgente)', bg: 'var(--triage-blue-bg)', text: 'var(--triage-blue-text)' },
};

const errMsg = (err: unknown, fallback: string): string => (err instanceof ApiError ? err.message : fallback);

/**
 * Primeira página migrada para TanStack Query (Fase 3 da absorção de
 * arquitetura, 11/09/2026) — adoção incremental, ver `lib/query-client.ts`.
 * `queuesQuery`/`ticketsQuery` substituem o `useState`+`useEffect` manual;
 * cada mutação invalida `['tickets', filaId]` no sucesso em vez de chamar
 * `fetchTickets()` explicitamente.
 */
export const QueueDashboardPage: React.FC = () => {
  const { api } = useSession();
  const queuesApi = createQueuesApi(api);
  const queryClient = useQueryClient();

  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [callRoom, setCallRoom] = useState('Consultório 01');
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);

  const queuesQuery = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const data = await queuesApi.listQueues();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0 && !selectedQueueId) setSelectedQueueId(list[0]!.id);
      return list as readonly Queue[];
    },
  });

  const ticketsQuery = useQuery({
    queryKey: ['tickets', selectedQueueId],
    queryFn: async () => {
      const data = await queuesApi.listTickets(selectedQueueId);
      return (Array.isArray(data) ? data : []) as readonly QueueTicket[];
    },
    enabled: !!selectedQueueId,
  });

  const invalidateTickets = () => queryClient.invalidateQueries({ queryKey: ['tickets', selectedQueueId] });

  const callMutation = useMutation({
    mutationFn: (ticket: QueueTicket) => queuesApi.callTicket(ticket.id, { callRoom: callRoom.trim() }),
    onSuccess: (_data, ticket) => {
      toast.success(`Senha ${ticket.ticketNumber} chamada para ${callRoom.trim()}.`);
      return invalidateTickets();
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao chamar paciente.')),
    onSettled: () => setProcessingTicketId(null),
  });

  const recallMutation = useMutation({
    mutationFn: (ticket: QueueTicket) => queuesApi.recallTicket(ticket.id),
    onSuccess: (_data, ticket) => {
      toast.success(`Senha ${ticket.ticketNumber} rechamada.`);
      return invalidateTickets();
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao rechamar paciente.')),
    onSettled: () => setProcessingTicketId(null),
  });

  const statusMutation = useMutation({
    mutationFn: ({ ticket, status }: { ticket: QueueTicket; status: 'in_service' | 'absent' }) =>
      queuesApi.updateStatus(ticket.id, { status }),
    onSuccess: (_data, { status }) => {
      toast.success(status === 'in_service' ? 'Atendimento iniciado.' : 'Paciente marcado como ausente.');
      return invalidateTickets();
    },
    onError: (err) => toast.error(errMsg(err, 'Erro ao atualizar status do ticket.')),
    onSettled: () => setProcessingTicketId(null),
  });

  const handleCall = (ticket: QueueTicket) => {
    if (!callRoom.trim()) { toast.error('Informe o consultório/local de atendimento.'); return; }
    setProcessingTicketId(ticket.id);
    callMutation.mutate(ticket);
  };

  const handleRecall = (ticket: QueueTicket) => {
    setProcessingTicketId(ticket.id);
    recallMutation.mutate(ticket);
  };

  const handleStatusChange = (ticket: QueueTicket, status: 'in_service' | 'absent') => {
    setProcessingTicketId(ticket.id);
    statusMutation.mutate({ ticket, status });
  };

  const queues = queuesQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];
  const loading = ticketsQuery.isLoading;
  const errorMessage = queuesQuery.isError
    ? errMsg(queuesQuery.error, 'Erro ao carregar filas.')
    : ticketsQuery.isError
      ? errMsg(ticketsQuery.error, 'Erro ao carregar senhas da fila.')
      : null;

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

      {errorMessage && <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</p>}

      <Card>
        <CardHeader>
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
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <p role="status" className="p-5 text-sm text-muted-foreground">Carregando fila de espera...</p>
          ) : tickets.length === 0 ? (
            <EmptyState
              className="border-none"
              title="Nenhum paciente na fila"
              description="Ninguém aguardando ou em chamada nesta fila no momento."
            />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Senha</th>
                  <th className="p-3 font-semibold">Classificação Manchester</th>
                  <th className="p-3 font-semibold">Score Prioridade</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold">Chamadas</th>
                  <th className="p-3 font-semibold">Ações de Chamamento</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const badge = t.riskColor ? MANCHESTER_BADGE_STYLE[t.riskColor] : null;
                  const isProcessing = processingTicketId === t.id;

                  return (
                    <tr
                      key={t.id}
                      className={`border-t border-border ${t.isExceeded ? 'bg-[var(--color-warning-soft)]' : ''}`}
                    >
                      <td className="p-3 font-mono font-bold">{t.ticketNumber}</td>
                      <td className="p-3">
                        {badge ? (
                          <Badge style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</Badge>
                        ) : (
                          <Badge variant="outline">Sem Triagem</Badge>
                        )}
                        {t.isExceeded && (
                          <Badge variant="destructive" className="ml-1.5">TEMPO EXCEDIDO!</Badge>
                        )}
                      </td>
                      <td className="p-3 font-mono">{t.priorityScore}</td>
                      <td className="p-3">
                        <Badge variant={t.status === 'called' ? 'warning' : t.status === 'in_service' ? 'success' : 'outline'}>
                          {t.status === 'called' ? `CHAMADO (${t.callRoom || ''})` : t.status}
                        </Badge>
                      </td>
                      <td className="p-3">{t.callCount}x</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {t.status === 'waiting' && (
                            <Button size="sm" onClick={() => handleCall(t)} disabled={isProcessing}>
                              Chamar
                            </Button>
                          )}
                          {t.status === 'called' && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => handleRecall(t)} disabled={isProcessing}>
                                Rechamar
                              </Button>
                              <Button size="sm" onClick={() => handleStatusChange(t, 'in_service')} disabled={isProcessing}>
                                Iniciar Atendimento
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleStatusChange(t, 'absent')} disabled={isProcessing}>
                                Ausente
                              </Button>
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
        </CardContent>
      </Card>
    </main>
  );
};
