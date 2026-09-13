import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createEncountersApi,
  type Encounter,
  type EncounterStatus,
  type PostConsultationDetail,
} from '../lib/encounters-api.js';
import { Overlay } from '../components/BedAllocationModal.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

const errMsg = (err: unknown, fallback: string): string => (err instanceof ApiError ? err.message : fallback);

export const EncounterListPage: React.FC = () => {
  const { api } = useSession();
  const encountersApi = createEncountersApi(api);
  const queryClient = useQueryClient();

  // Modal / Ação de alteração de estado
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [nextStatus, setNextStatus] = useState<EncounterStatus>('triage_pending');
  const [cancelReason, setCancelReason] = useState('');
  const [postConsultationDetail, setPostConsultationDetail] = useState<PostConsultationDetail | ''>('');
  const [updating, setUpdating] = useState(false);

  const encountersQuery = useQuery({
    queryKey: ['encounters'],
    queryFn: async () => {
      const data = await encountersApi.listEncounters();
      return Array.isArray(data) ? data : [];
    },
  });

  const encounters = encountersQuery.data ?? [];
  const loading = encountersQuery.isLoading;
  const errorMessage = encountersQuery.isError ? errMsg(encountersQuery.error, 'Erro ao carregar atendimentos.') : null;
  const fetchEncounters = () => queryClient.invalidateQueries({ queryKey: ['encounters'] });

  const handleOpenStatusModal = (encounter: Encounter) => {
    setSelectedEncounter(encounter);
    setCancelReason('');
    setPostConsultationDetail('');
    // 'triage_pending→triaged' e 'consultation_pending→in_consultation' saíram
    // do sugestor: viram automáticas (triagem salva / paciente chamado na fila),
    // então o próximo passo manual sugerido pula direto pra depois delas.
    const statusMap: Record<EncounterStatus, EncounterStatus> = {
      created: 'triage_pending',
      triage_pending: 'triage_pending',
      triaged: 'consultation_pending',
      consultation_pending: 'consultation_pending',
      in_consultation: 'post_consultation',
      post_consultation: 'completed',
      completed: 'completed',
      canceled: 'canceled',
    };
    setNextStatus(statusMap[encounter.status]);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter) return;

    if (nextStatus === 'canceled' && !cancelReason.trim()) {
      toast.error('O motivo de cancelamento é obrigatório ao cancelar um atendimento.');
      return;
    }

    if (nextStatus === 'post_consultation' && !postConsultationDetail) {
      toast.error('Informe o que está acontecendo com o paciente (medicando, aguardando exames ou aguardando reavaliação).');
      return;
    }

    setUpdating(true);
    try {
      await encountersApi.updateStatus(selectedEncounter.id, {
        status: nextStatus,
        cancelReason: nextStatus === 'canceled' ? cancelReason.trim() : null,
        postConsultationDetail: nextStatus === 'post_consultation' ? postConsultationDetail || null : null,
        expectedUpdatedAt: selectedEncounter.updatedAt,
      });
      setSelectedEncounter(null);
      toast.success('Status do atendimento atualizado.');
      await fetchEncounters();
    } catch (err) {
      toast.error(errMsg(err, 'Erro ao atualizar status do atendimento.'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <main aria-labelledby="encounters-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="encounters-heading">Atendimentos abertos (UPA 24h)</h1>
          <p>Registro de admissões — data/hora, paciente, tipo, queixa principal e status</p>
        </div>
        <Button asChild>
          <a href="#/atendimentos/novo">+ Novo Atendimento</a>
        </Button>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</p>}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando atendimentos...</p>
      ) : encounters.length === 0 ? (
        <EmptyState title="Nenhum atendimento registrado" description="Abra um novo atendimento para começar." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Data/Hora</th>
                  <th className="p-3 font-semibold">Paciente ID</th>
                  <th className="p-3 font-semibold">Tipo / Origem</th>
                  <th className="p-3 font-semibold">Queixa Principal</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((enc) => (
                  <tr key={enc.id} className="border-t border-border">
                    <td className="p-3">{new Date(enc.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="p-3 font-mono">{enc.patientId.substring(0, 8)}...</td>
                    <td className="p-3">
                      <strong>{enc.encounterType}</strong> ({enc.origin})
                    </td>
                    <td className="p-3">{enc.chiefComplaint}</td>
                    <td className="p-3">
                      <Badge variant={enc.status === 'completed' ? 'success' : enc.status === 'canceled' ? 'destructive' : 'warning'}>
                        {enc.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Registro clínico (ficha, enfermagem, SAE, solicitações) continua acessível
                            mesmo após o atendimento ser concluído/cancelado — um prontuário não pode
                            "sumir" só porque o status avançou (achado de auditoria em 10/09/2026). */}
                        {(enc.status === 'created' || enc.status === 'triage_pending') && (
                          <Button asChild size="sm">
                            <a href={`#/atendimentos/${enc.id}/triagem`}>Realizar Triagem</a>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="secondary">
                          <a href={`#/atendimentos/${enc.id}/consulta`}>
                            {enc.status === 'consultation_pending' ? 'Realizar Consulta' : 'Ficha Clínica'}
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <a href={`#/atendimentos/${enc.id}/enfermagem`}>Enfermagem</a>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <a href={`#/atendimentos/${enc.id}/sae`}>SAE</a>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <a href={`#/atendimentos/${enc.id}/acoes`}>Solicitações</a>
                        </Button>
                        {enc.status !== 'completed' && enc.status !== 'canceled' && (
                          <Button size="sm" variant="ghost" onClick={() => handleOpenStatusModal(enc)}>
                            Avançar Status
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {selectedEncounter && (
        <Overlay title="Alterar Status do Atendimento" onClose={() => setSelectedEncounter(null)}>
          <p>
            Status Atual: <strong>{selectedEncounter.status}</strong>
          </p>

          <form onSubmit={handleUpdateStatus} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
            <label htmlFor="nextStatus">Novo Status</label>
            {/* 'triaged' e 'in_consultation' saíram desta lista (12/09/2026): salvar a
                triagem e chamar o paciente na fila (Pronto Atendimento) já avançam o
                status sozinhos (ver apps/api/src/services/encounter-status.ts) — manter
                aqui geraria uma transição manual concorrendo com a automática. */}
            <select id="nextStatus" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as EncounterStatus)}>
              <option value="triage_pending">Aguardando Triagem (triage_pending)</option>
              <option value="consultation_pending">Aguardando Consulta (consultation_pending)</option>
              <option value="post_consultation">Pós-Avaliação Médica (post_consultation)</option>
              <option value="completed">Concluído (completed)</option>
              <option value="canceled">Cancelado (canceled)</option>
            </select>

            {nextStatus === 'canceled' && (
              <>
                <label htmlFor="cancelReason">Motivo do Cancelamento *</label>
                <input
                  id="cancelReason"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento"
                />
              </>
            )}

            {nextStatus === 'post_consultation' && (
              <>
                <label htmlFor="postConsultationDetail">O que está acontecendo? *</label>
                <select
                  id="postConsultationDetail"
                  value={postConsultationDetail}
                  onChange={(e) => setPostConsultationDetail(e.target.value as PostConsultationDetail)}
                >
                  <option value="">Selecione…</option>
                  <option value="medicando">Realizando Medicação</option>
                  <option value="aguardando_exames_laboratoriais">Aguardando Exames Laboratoriais</option>
                  <option value="aguardando_reavaliacao_medica">Aguardando Reavaliação Médica</option>
                </select>
              </>
            )}

            <div className="vl-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setSelectedEncounter(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Salvando...' : 'Confirmar Alteração'}
              </Button>
            </div>
          </form>
        </Overlay>
      )}
    </main>
  );
};
