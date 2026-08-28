import React, { useState } from 'react';
import { MedicationScheduleData } from '../lib/nursing-api';

interface BedsideCheckModalProps {
  schedule: MedicationScheduleData;
  onClose: () => void;
  onConfirm: (payload: {
    status: 'administered' | 'not_administered' | 'refused' | 'suspended';
    notes?: string | null;
    nonAdminReason?: string | null;
    bedSideChecked: boolean;
    batchNumber?: string | null;
  }) => Promise<void>;
}

type AdminStatus = 'administered' | 'not_administered' | 'refused' | 'suspended';

export const BedsideCheckModal: React.FC<BedsideCheckModalProps> = ({ schedule, onClose, onConfirm }) => {
  const [status, setStatus] = useState<AdminStatus>('administered');
  const [bedSideChecked, setBedSideChecked] = useState(true);
  const [nonAdminReason, setNonAdminReason] = useState('');
  const [notes, setNotes] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status !== 'administered' && nonAdminReason.trim().length < 10) {
      setError('A recusa, suspensão ou não administração exige justificativa de no mínimo 10 caracteres.');
      return;
    }

    if (status === 'administered' && !bedSideChecked) {
      setError('A confirmação exige a checagem beira-leito (5 Certos de Enfermagem).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        status,
        bedSideChecked,
        nonAdminReason: status !== 'administered' ? nonAdminReason : null,
        notes: notes.trim() ? notes : null,
        batchNumber: batchNumber.trim() ? batchNumber : null,
      });
      onClose();
    } catch (err) {
      const e = err as Error;
      setError(e?.message || 'Erro ao registrar administração.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-gray-900 text-lg">Checagem Beira-Leito (5 Certos)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
            &times;
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}

        <div className="bg-blue-50 p-3 rounded text-sm text-blue-900 space-y-1">
          <p className="font-bold">{schedule.medicationName}</p>
          <p>
            Dose: <strong>{schedule.dose} {schedule.doseUnit}</strong> | Via: <strong>{schedule.route}</strong>
          </p>
          <p>Horário Previsto: <strong>{new Date(schedule.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status da Execução:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminStatus)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="administered">Administrado com Sucesso</option>
              <option value="refused">Recusado pelo Paciente</option>
              <option value="not_administered">Não Administrado / Ausente</option>
              <option value="suspended">Suspenso pela Enfermagem/Médico</option>
            </select>
          </div>

          {status === 'administered' && (
            <div className="p-3 bg-green-50 rounded border border-green-200 text-sm space-y-2">
              <span className="font-semibold text-green-900 block">5 Certos de Enfermagem:</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-green-900">
                <input
                  type="checkbox"
                  checked={bedSideChecked}
                  onChange={(e) => setBedSideChecked(e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded"
                />
                Confirmo Paciente Certo, Medicamento Certo, Dose Certa, Via Certa e Hora Certa no Leito.
              </label>
            </div>
          )}

          {status !== 'administered' && (
            <div>
              <label className="block text-xs font-semibold text-red-700 mb-1">
                Justificativa Clínica/Técnica Obrigatória (mín. 10 caracteres):
              </label>
              <textarea
                value={nonAdminReason}
                onChange={(e) => setNonAdminReason(e.target.value)}
                placeholder="Descreva o motivo da recusa, ausência ou suspensão..."
                rows={2}
                className="w-full p-2 border border-red-300 rounded text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Número do Lote (Opcional):</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Ex: LOTE-88493"
              className="w-full p-2 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Observações Adicionais (Opcional):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Tolerou bem a medicação."
              className="w-full p-2 border rounded text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded text-xs font-medium hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Confirmando...' : 'Confirmar Checagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
