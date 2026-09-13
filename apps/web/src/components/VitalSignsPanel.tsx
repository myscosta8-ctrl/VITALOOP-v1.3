import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createVitalSignsApi, type VitalSignsReading, type VitalSignsValues } from '../lib/vital-signs-api.js';

interface VitalSignsPanelProps {
  encounterId: string;
  source: 'consulta' | 'enfermagem';
}

const EMPTY_FORM: VitalSignsValues = {
  systolicBp: null,
  diastolicBp: null,
  heartRate: null,
  respiratoryRate: null,
  temperature: null,
  oxygenSaturation: null,
};

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/**
 * Reavaliação de sinais vitais fora da Triagem (Fase 2, 12/09/2026) — painel
 * reaproveitado tanto na Consulta Médica quanto na Enfermagem, já que os dois
 * papéis reaferem sinais vitais durante o atendimento. Não repete a aferição
 * inicial da Triagem (`TriagemTab.tsx`), só lista o que foi reaferido depois.
 */
export const VitalSignsPanel: React.FC<VitalSignsPanelProps> = ({ encounterId, source }) => {
  const { api } = useSession();
  const vitalSignsApi = createVitalSignsApi(api);

  const [readings, setReadings] = useState<readonly VitalSignsReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<VitalSignsValues>(EMPTY_FORM);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vitalSignsApi.listReadings(encounterId);
      setReadings(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao carregar reavaliações de sinais vitais.');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await vitalSignsApi.recordReading(encounterId, { source, vitals: form, notes: notes.trim() || null });
      setForm(EMPTY_FORM);
      setNotes('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao registrar reavaliação de sinais vitais.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 15, borderTop: '2px solid #e2e8f0', paddingTop: 15 }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Reavaliação de Sinais Vitais</h4>

      {errorMessage && (
        <p role="alert" style={{ padding: 8, borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: 10 }}>
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p role="status">Carregando reavaliações…</p>
      ) : readings.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma reafericão registrada além da triagem inicial.</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {readings.map((r) => (
            <div key={r.id} style={{ padding: 8, borderLeft: '4px solid #0d9488', backgroundColor: '#f0fdfa', marginBottom: 8, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                {new Date(r.createdAt).toLocaleString('pt-BR')} · {r.source === 'consulta' ? 'Consulta Médica' : 'Enfermagem'}
              </div>
              <div>
                {r.vitals.systolicBp != null && r.vitals.diastolicBp != null && `PA: ${r.vitals.systolicBp}/${r.vitals.diastolicBp} mmHg  `}
                {r.vitals.heartRate != null && `FC: ${r.vitals.heartRate} bpm  `}
                {r.vitals.respiratoryRate != null && `FR: ${r.vitals.respiratoryRate} ipm  `}
                {r.vitals.temperature != null && `Temp: ${r.vitals.temperature}°C  `}
                {r.vitals.oxygenSaturation != null && `SpO2: ${r.vitals.oxygenSaturation}%`}
              </div>
              {r.notes && <div style={{ marginTop: 4 }}>{r.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 6 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>PA Sistólica (mmHg)</label>
          <input
            type="number"
            value={form.systolicBp ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, systolicBp: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>PA Diastólica (mmHg)</label>
          <input
            type="number"
            value={form.diastolicBp ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, diastolicBp: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>FC (bpm)</label>
          <input
            type="number"
            value={form.heartRate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, heartRate: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>FR (ipm)</label>
          <input
            type="number"
            value={form.respiratoryRate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, respiratoryRate: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Temperatura (°C)</label>
          <input
            type="number"
            step="0.1"
            value={form.temperature ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, temperature: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>SpO2 (%)</label>
          <input
            type="number"
            value={form.oxygenSaturation ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, oxygenSaturation: numOrNull(e.target.value) }))}
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12 }}>Observações</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: paciente refere melhora da dor"
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '6px 14px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {submitting ? 'Registrando…' : 'Registrar Reavaliação'}
          </button>
        </div>
      </form>
    </div>
  );
};
