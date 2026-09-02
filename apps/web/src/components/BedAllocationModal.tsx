import React, { useState } from 'react';
import { BedData, BedSectorData } from '../lib/bed-api';

interface BedAllocationModalProps {
  bed: BedData | null;
  sectors: BedSectorData[];
  onClose: () => void;
  onConfirmAllocation: (
    encounterId: string,
    bedId: string,
    patientId: string,
    regulationCode?: string | null
  ) => Promise<void>;
  onCreateExtraBed?: (sectorId: string, bedNumber: string) => Promise<void>;
}

export const Overlay: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(18,35,45,.45)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px',
      overflowY: 'auto',
      zIndex: 100,
    }}
  >
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 520, maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        <button type="button" onClick={onClose} style={{ marginTop: 0 }}>
          Fechar
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const BedAllocationModal: React.FC<BedAllocationModalProps> = ({
  bed,
  sectors,
  onClose,
  onConfirmAllocation,
  onCreateExtraBed,
}) => {
  const [encounterId, setEncounterId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [regulationCode, setRegulationCode] = useState('');
  const [isExtraMode, setIsExtraMode] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.id || '');
  const [extraBedNumber, setExtraBedNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isExtraMode) {
      if (!extraBedNumber.trim()) {
        setError('Informe a numeração/identificação do leito extra.');
        return;
      }
      setLoading(true);
      try {
        if (onCreateExtraBed) {
          await onCreateExtraBed(selectedSectorId, extraBedNumber.trim());
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar leito extra.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!encounterId.trim() || !patientId.trim()) {
      setError('ID do atendimento e ID do paciente são obrigatórios.');
      return;
    }

    if (!bed) return;

    setLoading(true);
    try {
      await onConfirmAllocation(
        encounterId.trim(),
        bed.id,
        patientId.trim(),
        regulationCode.trim() ? regulationCode.trim() : null
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alocar leito.');
    } finally {
      setLoading(false);
    }
  };

  const title = isExtraMode ? 'Abertura de Leito Extra (BED-004)' : `Alocação de Leito: ${bed?.bedNumber || ''}`;

  return (
    <Overlay title={title} onClose={onClose}>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
        {!isExtraMode ? (
          <>
            <div>
              <label htmlFor="encounterId">ID do Atendimento *</label>
              <input
                id="encounterId"
                type="text"
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
                placeholder="Ex: ENC-12345"
              />
            </div>
            <div>
              <label htmlFor="patientId">ID do Paciente *</label>
              <input
                id="patientId"
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Ex: PAT-67890"
              />
            </div>
            <div>
              <label htmlFor="regulationCode">Código de Regulação (CROSS/SISREG - Opcional)</label>
              <input
                id="regulationCode"
                type="text"
                value={regulationCode}
                onChange={(e) => setRegulationCode(e.target.value)}
                placeholder="Ex: CROSS-994821"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="sectorSelect">Setor Assistencial</label>
              <select
                id="sectorSelect"
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="extraBedNumber">Identificação do Leito Extra</label>
              <input
                id="extraBedNumber"
                type="text"
                value={extraBedNumber}
                onChange={(e) => setExtraBedNumber(e.target.value)}
                placeholder="Ex: Leito Extra 01"
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          {onCreateExtraBed && (
            <button
              type="button"
              onClick={() => setIsExtraMode(!isExtraMode)}
              style={{ background: 'transparent', color: 'var(--color-primary)', padding: 0, marginTop: 0 }}
            >
              {isExtraMode ? 'Voltar para Alocação Direta' : '+ Abrir Leito Extra'}
            </button>
          )}

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'var(--color-surface-sunken)', color: 'var(--color-text)', marginTop: 0 }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ marginTop: 0 }}>
              {loading ? 'Confirmando...' : isExtraMode ? 'Criar Leito Extra' : 'Confirmar Alocação'}
            </button>
          </div>
        </div>
      </form>
    </Overlay>
  );
};

