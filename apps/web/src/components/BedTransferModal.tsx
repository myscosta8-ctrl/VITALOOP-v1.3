import React, { useState } from 'react';
import { BedData, SectorMapData } from '../lib/bed-api';

interface BedTransferModalProps {
  currentBed: BedData;
  sectorsMap: SectorMapData[];
  onClose: () => void;
  onConfirmTransfer: (allocationId: string, targetBedId: string, transferReason: string) => Promise<void>;
}

export const BedTransferModal: React.FC<BedTransferModalProps> = ({
  currentBed,
  sectorsMap,
  onClose,
  onConfirmTransfer,
}) => {
  const availableBeds = sectorsMap
    .flatMap((s) => s.beds)
    .filter((b) => b.status === 'available' && b.id !== currentBed.id);

  const [targetBedId, setTargetBedId] = useState(availableBeds[0]?.id || '');
  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetBedId) {
      setError('Selecione um leito livre para transferência.');
      return;
    }

    if (transferReason.trim().length < 10) {
      setError('A justificativa de transferência exige no mínimo 10 caracteres.');
      return;
    }

    if (!currentBed.allocationId) {
      setError('Alocação ativa não encontrada para o leito atual.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirmTransfer(currentBed.allocationId, targetBedId, transferReason.trim());
      onClose();
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Erro ao realizar transferência de leito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-gray-900 text-lg">Transferência Interna de Leito (BED-006)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
            &times;
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}

        <div className="bg-blue-50 p-3 rounded text-sm text-blue-900 space-y-1">
          <p className="font-bold">Leito de Origem: {currentBed.bedNumber}</p>
          <p className="truncate">Paciente: <strong>{currentBed.patientName || 'Não identificado'}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Leito de Destino:</label>
            {availableBeds.length === 0 ? (
              <p className="text-xs text-red-600 font-semibold p-2 bg-red-50 rounded border border-red-200">
                Não há leitos disponíveis na UPA no momento para transferência.
              </p>
            ) : (
              <select
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.sectorName ? `${b.sectorName} - ` : ''}{b.bedNumber} {b.isExtra ? '(Extra)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1">
              Justificativa Clínica/Técnica Obrigatória (mín. 10 caracteres) *:
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Informe a necessidade assistencial da movimentação..."
              className="w-full p-2 border border-red-300 rounded text-sm"
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
              disabled={loading || availableBeds.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Transferindo...' : 'Confirmar Transferência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
