import React, { useState } from 'react';
import { BedData, BedSectorData } from '../lib/bed-api';
import type { Encounter } from '../lib/encounters-api';
import { Button } from './ui/button.js';

const ENCOUNTER_STATUS_LABEL: Record<Encounter['status'], string> = {
  created: 'Recém-criado',
  triage_pending: 'Aguardando triagem',
  triaged: 'Triado',
  consultation_pending: 'Aguardando consulta',
  in_consultation: 'Em consulta',
  post_consultation: 'Pós-consulta',
  completed: 'Concluído',
  canceled: 'Cancelado',
};

interface BedAllocationModalProps {
  bed: BedData | null;
  sectors: BedSectorData[];
  candidateEncounters: readonly Encounter[];
  onClose: () => void;
  onConfirmAllocation: (
    encounterId: string,
    bedId: string,
    patientId: string,
    regulationCode?: string | null
  ) => Promise<void>;
  onCreateExtraBed?: (sectorId: string, bedNumber: string, isIsolation: boolean) => Promise<void>;
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
    <div className="w-[520px] max-w-full rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
      {children}
    </div>
  </div>
);

export const BedAllocationModal: React.FC<BedAllocationModalProps> = ({
  bed,
  sectors,
  candidateEncounters,
  onClose,
  onConfirmAllocation,
  onCreateExtraBed,
}) => {
  const [encounterId, setEncounterId] = useState('');
  const [encounterFilter, setEncounterFilter] = useState('');
  const [regulationCode, setRegulationCode] = useState('');
  const [isExtraMode, setIsExtraMode] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.id || '');
  const [extraBedNumber, setExtraBedNumber] = useState('');
  const [extraIsIsolation, setExtraIsIsolation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterText = encounterFilter.trim().toLowerCase();
  const filteredEncounters = filterText
    ? candidateEncounters.filter(
        (e) => e.chiefComplaint.toLowerCase().includes(filterText) || e.patientId.toLowerCase().includes(filterText),
      )
    : candidateEncounters;

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
          await onCreateExtraBed(selectedSectorId, extraBedNumber.trim(), extraIsIsolation);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar leito extra.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const selectedEncounter = candidateEncounters.find((e) => e.id === encounterId);
    if (!selectedEncounter) {
      setError('Selecione um atendimento da lista.');
      return;
    }

    if (!bed) return;

    setLoading(true);
    try {
      await onConfirmAllocation(
        selectedEncounter.id,
        bed.id,
        selectedEncounter.patientId,
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
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
        {!isExtraMode ? (
          <>
            <div>
              <label htmlFor="encounterFilter">Buscar atendimento (queixa ou nº do paciente)</label>
              <input
                id="encounterFilter"
                type="text"
                value={encounterFilter}
                onChange={(e) => setEncounterFilter(e.target.value)}
                placeholder="Digite para filtrar a lista abaixo..."
              />
            </div>
            <div>
              <label htmlFor="encounterId">Atendimento *</label>
              {filteredEncounters.length === 0 ? (
                <p role="status">
                  Nenhum atendimento em aberto disponível para internação (todos já têm leito ou não há
                  correspondência com a busca).
                </p>
              ) : (
                <select id="encounterId" value={encounterId} onChange={(e) => setEncounterId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {filteredEncounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.chiefComplaint} — paciente {enc.patientId.substring(0, 8)}… (
                      {ENCOUNTER_STATUS_LABEL[enc.status]})
                    </option>
                  ))}
                </select>
              )}
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input
                type="checkbox"
                checked={extraIsIsolation}
                onChange={(e) => setExtraIsIsolation(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Leito de isolamento
            </label>
            <p role="status" style={{ marginTop: 8 }}>
              Leito extra criado para lotação máxima/excedida — some sozinho após 30 min se ninguém for alocado nele.
            </p>
          </>
        )}

        <div className="mt-4 flex items-center justify-between">
          {onCreateExtraBed && (
            <Button type="button" variant="link" className="p-0" onClick={() => setIsExtraMode(!isExtraMode)}>
              {isExtraMode ? 'Voltar para Alocação Direta' : '+ Abrir Leito Extra'}
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Confirmando...' : isExtraMode ? 'Criar Leito Extra' : 'Confirmar Alocação'}
            </Button>
          </div>
        </div>
      </form>
    </Overlay>
  );
};

