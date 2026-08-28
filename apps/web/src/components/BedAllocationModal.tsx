import React, { useState } from 'react';
import { BedData, BedSectorData } from '../lib/bed-api';

interface BedAllocationModalProps {
  bed: BedData | null;
  sectors: BedSectorData[];
  onClose: () => void;
  onConfirmAllocation: (bedId: string, regulationCode?: string | null) => Promise<void>;
  onCreateExtraBed?: (sectorId: string, bedNumber: string) => Promise<void>;
}

export const BedAllocationModal: React.FC<BedAllocationModalProps> = ({
  bed,
  sectors,
  onClose,
  onConfirmAllocation,
  onCreateExtraBed,
}) => {
  const [regulationCode, setRegulationCode] = useState('');
  const [isExtraMode, setIsExtraMode] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.id || '');
  const [extraBedNumber, setExtraBedNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isExtraMode) {
        if (!extraBedNumber.trim()) {
          setError('Informe a numeração/identificação do leito extra.');
          setLoading(false);
          return;
        }
        if (onCreateExtraBed) {
          await onCreateExtraBed(selectedSectorId, extraBedNumber.trim());
        }
      } else if (bed) {
        await onConfirmAllocation(bed.id, regulationCode.trim() ? regulationCode.trim() : null);
      }
      onClose();
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj?.message || 'Erro ao alocar leito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-gray-900 text-lg">
            {isExtraMode ? 'Abertura de Leito Extra (BED-004)' : `Alocação de Leito: ${bed?.bedNumber || ''}`}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
            &times;
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isExtraMode ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Código de Regulação (CROSS/SISREG - Opcional):</label>
              <input
                type="text"
                value={regulationCode}
                onChange={(e) => setRegulationCode(e.target.value)}
                placeholder="Ex: CROSS-994821"
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Setor Assistencial:</label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Identificação do Leito Extra:</label>
                <input
                  type="text"
                  value={extraBedNumber}
                  onChange={(e) => setExtraBedNumber(e.target.value)}
                  placeholder="Ex: Leito Extra 01"
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t">
            {onCreateExtraBed && (
              <button
                type="button"
                onClick={() => setIsExtraMode(!isExtraMode)}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                {isExtraMode ? 'Voltar para Alocação Direta' : '+ Abrir Leito Extra'}
              </button>
            )}

            <div className="flex gap-2 ml-auto">
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
                className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Confirmando...' : isExtraMode ? 'Criar Leito Extra' : 'Confirmar Alocação'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
