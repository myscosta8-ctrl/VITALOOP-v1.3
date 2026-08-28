import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createEncountersApi,
  type EncounterOrigin,
  type EncounterType,
} from '../lib/encounters-api.js';

export const EncounterOpenPage: React.FC = () => {
  const { api } = useSession();
  const encountersApi = createEncountersApi(api);

  const [patientId, setPatientId] = useState('');
  const [encounterType, setEncounterType] = useState<EncounterType>('urgency');
  const [origin, setOrigin] = useState<EncounterOrigin>('spontaneous');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!patientId.trim()) {
      setErrorMessage('O ID do paciente é obrigatório.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setErrorMessage('A queixa principal é obrigatória.');
      return;
    }

    setLoading(true);
    try {
      const created = await encountersApi.createEncounter({
        patientId: patientId.trim(),
        encounterType,
        origin,
        chiefComplaint: chiefComplaint.trim(),
      });
      setSuccessMessage(`Atendimento aberto com sucesso! ID: ${created.id}`);
      setPatientId('');
      setChiefComplaint('');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao abrir atendimento.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Abertura de Atendimento (UPA 24h)</h1>

      {errorMessage && (
        <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
            ID do Paciente *
          </label>
          <input
            id="patientId"
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Cole o ID (UUID) do paciente"
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="encounterType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Atendimento *
            </label>
            <select
              id="encounterType"
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value as EncounterType)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="urgency">Urgência</option>
              <option value="emergency">Emergência</option>
              <option value="elective">Eletivo / Consulta</option>
              <option value="return">Retorno</option>
            </select>
          </div>

          <div>
            <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
              Origem da Chegável *
            </label>
            <select
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value as EncounterOrigin)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="spontaneous">Demanda Espontânea</option>
              <option value="samu">SAMU</option>
              <option value="transfer">Transferência Inter-hospitalar</option>
              <option value="rescue_other">Resgate / Outros</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="chiefComplaint" className="block text-sm font-medium text-gray-700 mb-1">
            Queixa Principal / Motivo do Atendimento *
          </label>
          <textarea
            id="chiefComplaint"
            rows={3}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Descreva a queixa principal trazida pelo paciente ou acompanhante"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <a
            href="#/atendimentos"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Voltar para Fila
          </a>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Abrindo Atendimento...' : 'Abrir Atendimento'}
          </button>
        </div>
      </form>
    </div>
  );
};
