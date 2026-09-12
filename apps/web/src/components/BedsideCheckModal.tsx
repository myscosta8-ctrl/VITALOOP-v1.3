import React, { useState } from 'react';
import { MedicationScheduleData } from '../lib/nursing-api';
import { Overlay } from './BedAllocationModal.js';
import { Button } from './ui/button.js';

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
    <Overlay title="Checagem Beira-Leito (5 Certos)" onClose={onClose}>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="vl-info-box">
        <p style={{ fontWeight: 700, margin: 0 }}>{schedule.medicationName}</p>
        <p style={{ margin: '4px 0 0' }}>
          Dose: <strong>{schedule.dose} {schedule.doseUnit}</strong> | Via: <strong>{schedule.route}</strong>
        </p>
        <p style={{ margin: '4px 0 0' }}>
          Horário Previsto:{' '}
          <strong>{new Date(schedule.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }}>
        <label htmlFor="bedside-status">Status da Execução</label>
        <select id="bedside-status" value={status} onChange={(e) => setStatus(e.target.value as AdminStatus)}>
          <option value="administered">Administrado com Sucesso</option>
          <option value="refused">Recusado pelo Paciente</option>
          <option value="not_administered">Não Administrado / Ausente</option>
          <option value="suspended">Suspenso pela Enfermagem/Médico</option>
        </select>

        {status === 'administered' && (
          <div
            style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-success-soft)',
              border: '1px solid var(--color-success)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--color-success)', display: 'block', marginBottom: 6 }}>
              5 Certos de Enfermagem:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0, fontWeight: 400 }}>
              <input type="checkbox" checked={bedSideChecked} onChange={(e) => setBedSideChecked(e.target.checked)} />
              Confirmo Paciente Certo, Medicamento Certo, Dose Certa, Via Certa e Hora Certa no Leito.
            </label>
          </div>
        )}

        {status !== 'administered' && (
          <>
            <label htmlFor="bedside-non-admin-reason" style={{ color: 'var(--color-danger)' }}>
              Justificativa Clínica/Técnica Obrigatória (mín. 10 caracteres)
            </label>
            <textarea
              id="bedside-non-admin-reason"
              value={nonAdminReason}
              onChange={(e) => setNonAdminReason(e.target.value)}
              placeholder="Descreva o motivo da recusa, ausência ou suspensão..."
              rows={2}
            />
          </>
        )}

        <label htmlFor="bedside-batch">Número do Lote (Opcional)</label>
        <input
          id="bedside-batch"
          type="text"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          placeholder="Ex: LOTE-88493"
        />

        <label htmlFor="bedside-notes">Observações Adicionais (Opcional)</label>
        <input
          id="bedside-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Tolerou bem a medicação."
        />

        <div className="vl-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Confirmando...' : 'Confirmar Checagem'}
          </Button>
        </div>
      </form>
    </Overlay>
  );
};
