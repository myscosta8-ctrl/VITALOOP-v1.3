import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createEncountersApi,
  type Encounter,
  type EncounterStatus,
  type PostConsultationDetail,
} from '../lib/encounters-api.js';
import { Overlay } from '../components/BedAllocationModal.js';

export const EncounterListPage: React.FC = () => {
  const { api } = useSession();
  const encountersApi = createEncountersApi(api);

  const [encounters, setEncounters] = useState<readonly Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Ação de alteração de estado
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [nextStatus, setNextStatus] = useState<EncounterStatus>('triage_pending');
  const [cancelReason, setCancelReason] = useState('');
  const [postConsultationDetail, setPostConsultationDetail] = useState<PostConsultationDetail | ''>('');
  const [updating, setUpdating] = useState(false);

  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await encountersApi.listEncounters();
      setEncounters(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao carregar atendimentos.');
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  const handleOpenStatusModal = (encounter: Encounter) => {
    setSelectedEncounter(encounter);
    setCancelReason('');
    setPostConsultationDetail('');
    const statusMap: Record<EncounterStatus, EncounterStatus> = {
      created: 'triage_pending',
      triage_pending: 'triaged',
      triaged: 'consultation_pending',
      consultation_pending: 'in_consultation',
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
      setErrorMessage('O motivo de cancelamento é obrigatório ao cancelar um atendimento.');
      return;
    }

    if (nextStatus === 'post_consultation' && !postConsultationDetail) {
      setErrorMessage('Informe o que está acontecendo com o paciente (medicando, aguardando exames ou aguardando reavaliação).');
      return;
    }

    setUpdating(true);
    setErrorMessage(null);
    try {
      await encountersApi.updateStatus(selectedEncounter.id, {
        status: nextStatus,
        cancelReason: nextStatus === 'canceled' ? cancelReason.trim() : null,
        postConsultationDetail: nextStatus === 'post_consultation' ? postConsultationDetail || null : null,
        expectedUpdatedAt: selectedEncounter.updatedAt,
      });
      setSelectedEncounter(null);
      await fetchEncounters();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao atualizar status do atendimento.');
      }
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
        <a href="#/atendimentos/novo" className="vl-btn">
          + Novo Atendimento
        </a>
      </div>

      {errorMessage && <div role="alert">{errorMessage}</div>}

      {loading ? (
        <p role="status">Carregando atendimentos...</p>
      ) : encounters.length === 0 ? (
        <p role="status">Nenhum atendimento registrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Paciente ID</th>
              <th>Tipo / Origem</th>
              <th>Queixa Principal</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {encounters.map((enc) => {
              const statusBadgeClass =
                enc.status === 'completed' ? 'vl-badge-success' : enc.status === 'canceled' ? 'vl-badge-danger' : 'vl-badge-warning';

              return (
                <tr key={enc.id}>
                  <td>{new Date(enc.createdAt).toLocaleString('pt-BR')}</td>
                  <td className="vl-mono">{enc.patientId.substring(0, 8)}...</td>
                  <td>
                    <strong>{enc.encounterType}</strong> ({enc.origin})
                  </td>
                  <td>{enc.chiefComplaint}</td>
                  <td>
                    <span className={`vl-badge ${statusBadgeClass}`}>{enc.status}</span>
                  </td>
                  <td>
                    {enc.status !== 'completed' && enc.status !== 'canceled' && (
                      <div className="vl-row-actions">
                        {(enc.status === 'created' || enc.status === 'triage_pending') && (
                          <a href={`#/atendimentos/${enc.id}/triagem`} className="vl-btn vl-btn-success vl-btn-sm">
                            Realizar Triagem
                          </a>
                        )}
                        {enc.status === 'consultation_pending' && (
                          <a href={`#/atendimentos/${enc.id}/consulta`} className="vl-btn vl-btn-sm">
                            Realizar Consulta
                          </a>
                        )}
                        <a href={`#/atendimentos/${enc.id}/enfermagem`} className="vl-btn vl-btn-ghost vl-btn-sm">
                          Enfermagem
                        </a>
                        <a href={`#/atendimentos/${enc.id}/sae`} className="vl-btn vl-btn-ghost vl-btn-sm">
                          SAE
                        </a>
                        <a href={`#/atendimentos/${enc.id}/acoes`} className="vl-btn vl-btn-ghost vl-btn-sm">
                          Ações
                        </a>
                        <button onClick={() => handleOpenStatusModal(enc)} className="vl-btn-ghost vl-btn-sm">
                          Avançar Status
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selectedEncounter && (
        <Overlay title="Alterar Status do Atendimento" onClose={() => setSelectedEncounter(null)}>
          <p>
            Status Atual: <strong>{selectedEncounter.status}</strong>
          </p>

          <form onSubmit={handleUpdateStatus} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
            <label htmlFor="nextStatus">Novo Status</label>
            <select id="nextStatus" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as EncounterStatus)}>
              <option value="triage_pending">Aguardando Triagem (triage_pending)</option>
              <option value="triaged">Triado (triaged)</option>
              <option value="consultation_pending">Aguardando Consulta (consultation_pending)</option>
              <option value="in_consultation">Em Atendimento (in_consultation)</option>
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
              <button type="button" className="vl-btn-ghost" onClick={() => setSelectedEncounter(null)}>
                Cancelar
              </button>
              <button type="submit" disabled={updating}>
                {updating ? 'Salvando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </main>
  );
};
