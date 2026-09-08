import React, { useState } from 'react';
import { BedData, SectorMapData } from '../lib/bed-api';
import { Overlay } from './BedAllocationModal.js';

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
    <Overlay title="Transferência Interna de Leito (BED-006)" onClose={onClose}>
      {error && <div role="alert">{error}</div>}

      <div className="vl-info-box">
        <p style={{ margin: 0, fontWeight: 700 }}>Leito de Origem: {currentBed.bedNumber}</p>
        <p style={{ margin: 0 }}>Paciente: <strong>{currentBed.patientName || 'Não identificado'}</strong></p>
      </div>

      <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
        <label htmlFor="target-bed">Leito de Destino:</label>
        {availableBeds.length === 0 ? (
          <p role="alert">Não há leitos disponíveis na UPA no momento para transferência.</p>
        ) : (
          <select id="target-bed" value={targetBedId} onChange={(e) => setTargetBedId(e.target.value)}>
            {availableBeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.sectorName ? `${b.sectorName} - ` : ''}{b.bedNumber} {b.isExtra ? '(Extra)' : ''}
              </option>
            ))}
          </select>
        )}

        <label htmlFor="transfer-reason">Justificativa Clínica/Técnica Obrigatória (mín. 10 caracteres) *:</label>
        <textarea
          id="transfer-reason"
          rows={3}
          value={transferReason}
          onChange={(e) => setTransferReason(e.target.value)}
          placeholder="Informe a necessidade assistencial da movimentação..."
        />

        <div className="vl-modal-actions">
          <button type="button" className="vl-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" disabled={loading || availableBeds.length === 0}>
            {loading ? 'Transferindo...' : 'Confirmar Transferência'}
          </button>
        </div>
      </form>
    </Overlay>
  );
};
