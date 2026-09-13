import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNursingSaeApi, type NursingScaleEvaluation, type ScaleType } from '../lib/nursing-sae-api.js';

interface Props {
  encounterId: string;
}

interface FieldOption {
  value: number;
  label: string;
}

interface ScaleFieldDef {
  key: string;
  label: string;
  options: FieldOption[];
}

// Escala de Braden (risco de lesão por pressão): 6 subescalas, 6..23 pontos.
const BRADEN_FIELDS: ScaleFieldDef[] = [
  { key: 'sensory', label: 'Percepção Sensorial', options: [
    { value: 1, label: '1 — Completamente limitada' }, { value: 2, label: '2 — Muito limitada' },
    { value: 3, label: '3 — Levemente limitada' }, { value: 4, label: '4 — Nenhuma limitação' },
  ] },
  { key: 'moisture', label: 'Umidade', options: [
    { value: 1, label: '1 — Completamente molhada' }, { value: 2, label: '2 — Muito molhada' },
    { value: 3, label: '3 — Ocasionalmente molhada' }, { value: 4, label: '4 — Raramente molhada' },
  ] },
  { key: 'activity', label: 'Atividade', options: [
    { value: 1, label: '1 — Acamado' }, { value: 2, label: '2 — Confinado à cadeira' },
    { value: 3, label: '3 — Anda ocasionalmente' }, { value: 4, label: '4 — Anda frequentemente' },
  ] },
  { key: 'mobility', label: 'Mobilidade', options: [
    { value: 1, label: '1 — Totalmente imóvel' }, { value: 2, label: '2 — Bastante limitada' },
    { value: 3, label: '3 — Levemente limitada' }, { value: 4, label: '4 — Nenhuma limitação' },
  ] },
  { key: 'nutrition', label: 'Nutrição', options: [
    { value: 1, label: '1 — Muito pobre' }, { value: 2, label: '2 — Provavelmente inadequada' },
    { value: 3, label: '3 — Adequada' }, { value: 4, label: '4 — Excelente' },
  ] },
  { key: 'friction', label: 'Fricção e Cisalhamento', options: [
    { value: 1, label: '1 — Problema' }, { value: 2, label: '2 — Problema em potencial' }, { value: 3, label: '3 — Nenhum problema' },
  ] },
];

// Escala de Morse (risco de queda): 6 itens, cada um com pontuação própria, 0..125 pontos.
const MORSE_FIELDS: ScaleFieldDef[] = [
  { key: 'history', label: 'Histórico de Quedas', options: [{ value: 0, label: 'Não' }, { value: 25, label: 'Sim' }] },
  { key: 'secondary', label: 'Diagnóstico Secundário', options: [{ value: 0, label: 'Não' }, { value: 15, label: 'Sim' }] },
  { key: 'aid', label: 'Suporte para Deambulação', options: [
    { value: 0, label: 'Nenhum / repouso / auxílio de enfermagem' }, { value: 15, label: 'Muletas / bengala / andador' }, { value: 30, label: 'Apoia-se em móveis' },
  ] },
  { key: 'iv', label: 'Terapia Endovenosa / Dispositivo', options: [{ value: 0, label: 'Não' }, { value: 20, label: 'Sim' }] },
  { key: 'gait', label: 'Marcha', options: [
    { value: 0, label: 'Normal / acamado / cadeira de rodas' }, { value: 10, label: 'Fraca' }, { value: 20, label: 'Comprometida' },
  ] },
  { key: 'mental', label: 'Estado Mental', options: [
    { value: 0, label: 'Orientado quanto às próprias limitações' }, { value: 15, label: 'Superestima capacidade / esquece limitações' },
  ] },
];

// Escala de Fugulin (SCP-EEUSP, classificação de complexidade assistencial):
// 12 indicadores, 1..4 cada, 12..48 pontos.
const FUGULIN_FIELDS: ScaleFieldDef[] = [
  { key: 'mentalState', label: 'Estado Mental' },
  { key: 'oxygenation', label: 'Oxigenação' },
  { key: 'vitalSigns', label: 'Sinais Vitais' },
  { key: 'motility', label: 'Motilidade' },
  { key: 'ambulation', label: 'Deambulação' },
  { key: 'feeding', label: 'Alimentação' },
  { key: 'bodyCare', label: 'Cuidado Corporal' },
  { key: 'elimination', label: 'Eliminação' },
  { key: 'therapeutics', label: 'Terapêutica' },
  { key: 'skinIntegrity', label: 'Integridade Cutâneo-Mucosa' },
  { key: 'dressingProcedure', label: 'Curativo' },
  { key: 'dressingTime', label: 'Tempo de Curativo' },
].map((f) => ({
  ...f,
  options: [
    { value: 1, label: '1 — Cuidados mínimos' },
    { value: 2, label: '2 — Cuidados intermediários' },
    { value: 3, label: '3 — Cuidados semi-intensivos' },
    { value: 4, label: '4 — Cuidados intensivos' },
  ],
}));

const SCALES: Record<Extract<ScaleType, 'braden' | 'morse' | 'fugulin'>, { label: string; fields: ScaleFieldDef[] }> = {
  braden: { label: 'Braden (risco de lesão por pressão)', fields: BRADEN_FIELDS },
  morse: { label: 'Morse (risco de queda)', fields: MORSE_FIELDS },
  fugulin: { label: 'Fugulin (complexidade assistencial)', fields: FUGULIN_FIELDS },
};

const RISK_LABEL: Record<string, string> = {
  low: 'Baixo Risco', moderate: 'Risco Moderado', high: 'Alto Risco', severe: 'Grave',
  minimal_care: 'Cuidados Mínimos', intermediate_care: 'Cuidados Intermediários',
  high_dependency: 'Alta Dependência', semi_intensive_care: 'Cuidados Semi-Intensivos', intensive_care: 'Cuidados Intensivos',
};

export const NursingScalesPanel: React.FC<Props> = ({ encounterId }) => {
  const { api } = useSession();
  const nursingSaeApi = createNursingSaeApi(api);

  const [activeScale, setActiveScale] = useState<keyof typeof SCALES>('braden');
  const [values, setValues] = useState<Record<string, number>>({});
  const [evaluations, setEvaluations] = useState<readonly NursingScaleEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nursingSaeApi.listNursingScales(encounterId);
      setEvaluations(Array.isArray(data) ? data : []);
    } catch {
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fields = SCALES[activeScale].fields;
  const allFilled = fields.every((f) => values[f.key] != null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await nursingSaeApi.applyNursingScale(encounterId, { scaleType: activeScale, scoreDetails: values });
      setMessage(`${SCALES[activeScale].label} aplicada. Escore: ${res.total_score} (${RISK_LABEL[res.risk_level] ?? res.risk_level})`);
      setValues({});
      await load();
    } catch (err: unknown) {
      setMessage((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4>2. Escalas Assistenciais (NUR-010)</h4>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(Object.keys(SCALES) as Array<keyof typeof SCALES>).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => { setActiveScale(key); setValues({}); }}
            data-testid={`scale-tab-${key}`}
            style={{
              padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
              border: activeScale === key ? '2px solid #2563eb' : '1px solid #ccc',
              backgroundColor: activeScale === key ? '#eff6ff' : '#fff',
            }}
          >
            {SCALES[key].label}
          </button>
        ))}
      </div>

      {message && <p data-testid="sae-msg">{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 15 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>{f.label}</label>
            <select
              data-testid={`scale-field-${f.key}`}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
              style={{ width: '100%', padding: 6 }}
            >
              <option value="">Selecione…</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="submit"
            disabled={!allFilled || submitting}
            data-testid={`apply-${activeScale}-btn`}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {submitting ? 'Aplicando…' : `Aplicar ${SCALES[activeScale].label}`}
          </button>
        </div>
      </form>

      <h5>Histórico de Avaliações</h5>
      {loading ? (
        <p role="status">Carregando…</p>
      ) : evaluations.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma escala aplicada ainda neste atendimento.</p>
      ) : (
        <div>
          {evaluations.map((ev) => (
            <div key={ev.id} style={{ padding: 8, borderLeft: '4px solid #2563eb', backgroundColor: '#f8fafc', marginBottom: 6, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{new Date(ev.evaluated_at).toLocaleString('pt-BR')}</div>
              <div>
                <strong>{SCALES[ev.scale_type as keyof typeof SCALES]?.label ?? ev.scale_type}</strong>: {ev.total_score} pts — {RISK_LABEL[ev.risk_level] ?? ev.risk_level}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
