import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createEncountersApi, type Encounter, type EncounterStatus } from '../lib/encounters-api.js';

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
    const statusMap: Record<EncounterStatus, EncounterStatus> = {
      created: 'triage_pending',
      triage_pending: 'triaged',
      triaged: 'consultation_pending',
      consultation_pending: 'in_consultation',
      in_consultation: 'completed',
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

    setUpdating(true);
    setErrorMessage(null);
    try {
      await encountersApi.updateStatus(selectedEncounter.id, {
        status: nextStatus,
        cancelReason: nextStatus === 'canceled' ? cancelReason.trim() : null,
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
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fila de Atendimentos (UPA 24h)</h1>
        <a
          href="#/atendimentos/novo"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          + Novo Atendimento
        </a>
      </div>

      {errorMessage && (
        <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando atendimentos...</div>
      ) : encounters.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded">
          Nenhum atendimento registrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3 font-semibold text-gray-700">Data/Hora</th>
                <th className="p-3 font-semibold text-gray-700">Paciente ID</th>
                <th className="p-3 font-semibold text-gray-700">Tipo / Origem</th>
                <th className="p-3 font-semibold text-gray-700">Queixa Principal</th>
                <th className="p-3 font-semibold text-gray-700">Status</th>
                <th className="p-3 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((enc) => (
                <tr key={enc.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(enc.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 font-mono text-sm">{enc.patientId.substring(0, 8)}...</td>
                  <td className="p-3 text-sm">
                    <span className="font-medium">{enc.encounterType}</span> ({enc.origin})
                  </td>
                  <td className="p-3 text-sm max-w-xs truncate">{enc.chiefComplaint}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                        enc.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : enc.status === 'canceled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {enc.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {enc.status !== 'completed' && enc.status !== 'canceled' && (
                      <div className="flex gap-2">
                        {(enc.status === 'created' || enc.status === 'triage_pending') && (
                          <a
                            href={`#/atendimentos/${enc.id}/triagem`}
                            className="px-3 py-1 text-xs bg-green-600 text-white font-medium rounded hover:bg-green-700 inline-block"
                          >
                            Realizar Triagem
                          </a>
                        )}
                        {enc.status === 'consultation_pending' && (
                          <a
                            href={`#/atendimentos/${enc.id}/consulta`}
                            className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700 inline-block"
                          >
                            Realizar Consulta
                          </a>
                        )}
                        <a
                          href={`#/atendimentos/${enc.id}/enfermagem`}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 inline-block"
                        >
                          Enfermagem
                        </a>
                        <a
                          href={`#/atendimentos/${enc.id}/sae`}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 inline-block"
                        >
                          SAE
                        </a>
                        <a
                          href={`#/atendimentos/${enc.id}/acoes`}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 inline-block"
                        >
                          Ações
                        </a>
                        <button
                          onClick={() => handleOpenStatusModal(enc)}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                          Avançar Status
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de transição de estado */}
      {selectedEncounter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Alterar Status do Atendimento</h2>
            <p className="text-sm text-gray-600 mb-4">
              Status Atual: <span className="font-bold">{selectedEncounter.status}</span>
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label htmlFor="nextStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Novo Status
                </label>
                <select
                  id="nextStatus"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as EncounterStatus)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="triage_pending">Aguardando Triagem (triage_pending)</option>
                  <option value="triaged">Triado (triaged)</option>
                  <option value="consultation_pending">Aguardando Consulta (consultation_pending)</option>
                  <option value="in_consultation">Em Atendimento (in_consultation)</option>
                  <option value="completed">Concluído (completed)</option>
                  <option value="canceled">Cancelado (canceled)</option>
                </select>
              </div>

              {nextStatus === 'canceled' && (
                <div>
                  <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo do Cancelamento *
                  </label>
                  <input
                    id="cancelReason"
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Descreva o motivo do cancelamento"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedEncounter(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Salvando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
