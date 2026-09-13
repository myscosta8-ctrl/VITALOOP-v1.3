import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createQueuesApi, type Queue, type QueueTicket } from '../lib/queues-api.js';

/**
 * Painel de TV — chamada pública de senha (Fase 5 do plano de reconstrução
 * assistencial). Reaproveita 100% `app.queue_tickets`/`app.queues` — não
 * precisou de tabela nova, só uma tela de exibição em fonte grande com
 * auto-atualização, pensada pra rodar numa TV da sala de espera.
 *
 * Simplificação assumida: como o Vitaloop não tem um modo de acesso
 * anônimo/kiosk, esta tela continua atrás de `RequireSession` como o resto
 * do app — na prática, um terminal fica logado com um usuário de baixa
 * permissão apontando pra TV, mesma solução usada em UPAs reais com sistemas
 * que não têm modo de exibição pública dedicado.
 */
export const PainelChamadaPage: React.FC = () => {
  const { api } = useSession();
  const queuesApi = createQueuesApi(api);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');

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
    refetchInterval: 5000,
  });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tickets = ticketsQuery.data ?? [];
  const called = tickets.filter((t) => t.status === 'called').sort((a, b) => (b.calledAt ?? '').localeCompare(a.calledAt ?? ''));
  const waitingCount = tickets.filter((t) => t.status === 'waiting').length;

  return (
    <main style={{ background: '#0f172a', color: '#fff', minHeight: '100vh', padding: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Painel de Chamada — UPA 24h</h1>
        <div style={{ fontSize: 20 }}>{now.toLocaleTimeString('pt-BR')}</div>
      </div>

      {called.length === 0 ? (
        <p style={{ fontSize: 24, color: '#94a3b8' }}>Nenhuma senha chamada no momento.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {called.map((t, i) => (
            <div
              key={t.id}
              data-testid="called-ticket-card"
              style={{
                background: i === 0 ? '#166534' : '#1e293b',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                border: i === 0 ? '3px solid #22c55e' : '1px solid #334155',
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 'bold', fontFamily: 'monospace' }}>{t.ticketNumber}</div>
              <div style={{ fontSize: 22, marginTop: 8 }}>{t.callRoom ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 30, fontSize: 16, color: '#94a3b8' }}>{waitingCount} paciente(s) aguardando na fila.</p>
    </main>
  );
};
