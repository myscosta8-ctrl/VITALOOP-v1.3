import React, { useState } from 'react';
import { NursingRecordData } from '../lib/nursing-api';

interface NursingRecordsViewProps {
  records: NursingRecordData[];
  onAddRecord: (type: 'admission' | 'evolution' | 'annotation', content: string) => Promise<void>;
  disabled?: boolean;
}

const RECORD_BADGE: Record<'admission' | 'evolution' | 'annotation', { label: string; className: string }> = {
  admission: { label: 'Admissão', className: 'vl-badge vl-badge-warning' },
  evolution: { label: 'Evolução', className: 'vl-badge vl-badge-info' },
  annotation: { label: 'Anotação', className: 'vl-badge vl-badge-neutral' },
};

export const NursingRecordsView: React.FC<NursingRecordsViewProps> = ({ records, onAddRecord, disabled = false }) => {
  const [recordType, setRecordType] = useState<'admission' | 'evolution' | 'annotation'>('annotation');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (recordType === 'admission' && content.trim().length < 10) {
      setError('A admissão de enfermagem exige um histórico/motivo de no mínimo 10 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddRecord(recordType, content);
      setContent('');
    } catch (err) {
      const e = err as Error;
      setError(e?.message || 'Erro ao registrar anotação de enfermagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vl-panel">
      <div className="vl-panel-head">
        <h3>Registros e Anotações de Enfermagem (NUR-001..003)</h3>
      </div>
      <div className="vl-panel-body">
        {error && <p role="alert">{error}</p>}

        <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 'none' }}>
          <label style={{ marginTop: 0 }}>Tipo de Registro</label>
          <div className="vl-field-inline" style={{ flexWrap: 'wrap', rowGap: 4 }}>
            <label style={{ marginTop: 0, fontWeight: 400 }}>
              <input
                type="radio"
                name="recordType"
                value="annotation"
                checked={recordType === 'annotation'}
                onChange={() => setRecordType('annotation')}
                disabled={disabled}
              />{' '}
              Anotação
            </label>
            <label style={{ marginTop: 0, fontWeight: 400 }}>
              <input
                type="radio"
                name="recordType"
                value="evolution"
                checked={recordType === 'evolution'}
                onChange={() => setRecordType('evolution')}
                disabled={disabled}
              />{' '}
              Evolução (Enfermeiro)
            </label>
            <label style={{ marginTop: 0, fontWeight: 400 }}>
              <input
                type="radio"
                name="recordType"
                value="admission"
                checked={recordType === 'admission'}
                onChange={() => setRecordType('admission')}
                disabled={disabled}
              />{' '}
              Admissão no Setor
            </label>
          </div>

          <label htmlFor="nursing-record-content">Registro</label>
          <textarea
            id="nursing-record-content"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={disabled || loading}
            placeholder="Descreva as observações, queixas do paciente, repouso, sinais vitais ou evolução da enfermagem..."
          />

          <button type="submit" className="vl-btn vl-btn-success" disabled={disabled || loading || !content.trim()}>
            {loading ? 'Gravando...' : 'Salvar Registro de Enfermagem'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <h4>Histórico de Enfermagem</h4>
          {records.length === 0 ? (
            <p role="status">Nenhum registro de enfermagem até o momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {records.map((r) => {
                const badge = RECORD_BADGE[r.recordType];
                return (
                  <div key={r.id} className="vl-schedule-card">
                    <div className="vl-schedule-card-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={badge.className}>{badge.label}</span>
                        <span className="vl-text-muted">Por: {r.professionalId}</span>
                      </div>
                      <span className="vl-text-muted">{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
