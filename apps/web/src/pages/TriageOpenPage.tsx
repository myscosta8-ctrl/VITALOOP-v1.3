import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createTriagesApi, ManchesterRiskColor } from '../lib/triages-api.js';

interface TriageOpenPageProps {
  encounterId: string;
  onSuccess?: () => void;
}

export const MANCHESTER_COLOR_LABEL: Record<ManchesterRiskColor, { label: string; bg: string; target: string }> = {
  red: { label: 'Vermelho (Emergência)', bg: '#ef4444', target: '0 minutos (Atendimento Imediato)' },
  orange: { label: 'Laranja (Muito Urgente)', bg: '#f97316', target: '10 minutos' },
  yellow: { label: 'Amarelo (Urgente)', bg: '#eab308', target: '60 minutos' },
  green: { label: 'Verde (Pouco Urgente)', bg: '#22c55e', target: '120 minutos' },
  blue: { label: 'Azul (Não Urgente)', bg: '#3b82f6', target: '240 minutos' },
};

export const TriageOpenPage: React.FC<TriageOpenPageProps> = ({ encounterId, onSuccess }) => {
  const { api } = useSession();
  const triagesApi = createTriagesApi(api);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptomsDuration, setSymptomsDuration] = useState('');
  const [history, setHistory] = useState('');

  const [systolicBp, setSystolicBp] = useState<string>('');
  const [diastolicBp, setDiastolicBp] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [oxygenSaturation, setOxygenSaturation] = useState<string>('');

  const [painScore, setPainScore] = useState<string>('');
  const [glasgowScore, setGlasgowScore] = useState<string>('');
  const [capillaryGlucose, setCapillaryGlucose] = useState<string>('');

  const [flowchart, setFlowchart] = useState('');
  const [discriminator, setDiscriminator] = useState('');
  const [riskColor, setRiskColor] = useState<ManchesterRiskColor>('yellow');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      setErrorMsg('A queixa principal é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await triagesApi.createTriage(encounterId, {
        chiefComplaint: chiefComplaint.trim(),
        symptomsDuration: symptomsDuration.trim() || null,
        history: history.trim() || null,
        vitals: {
          systolicBp: systolicBp ? Number(systolicBp) : null,
          diastolicBp: diastolicBp ? Number(diastolicBp) : null,
          heartRate: heartRate ? Number(heartRate) : null,
          respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
          temperature: temperature ? Number(temperature) : null,
          oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : null,
        },
        painScore: painScore !== '' ? Number(painScore) : null,
        glasgowScore: glasgowScore !== '' ? Number(glasgowScore) : null,
        capillaryGlucose: capillaryGlucose !== '' ? Number(capillaryGlucose) : null,
        flowchart: flowchart.trim() || null,
        discriminator: discriminator.trim() || null,
        riskColor,
        notes: notes.trim() || null,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.hash = '#/atendimentos';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar triagem clínica.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedManchester = MANCHESTER_COLOR_LABEL[riskColor];

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Triagem e Classificação de Risco (Manchester)</h2>
      <p style={{ color: '#666' }}>Atendimento ID: {encounterId}</p>

      {errorMsg && (
        <div style={{ padding: 10, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 15 }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
          <legend><strong>1. Queixa e História Clínica</strong></legend>
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="chiefComplaint" style={{ display: 'block', marginBottom: 4 }}>Queixa Principal *</label>
            <input
              id="chiefComplaint"
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Ex.: Dor torácica com irradiação para o braço"
              style={{ width: '100%', padding: 8 }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Tempo de Evolução</label>
              <input
                type="text"
                value={symptomsDuration}
                onChange={(e) => setSymptomsDuration(e.target.value)}
                placeholder="Ex.: 2 horas"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>História Resumida</label>
            <textarea
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais do quadro atual..."
              style={{ width: '100%', padding: 8 }}
            />
          </div>
        </fieldset>

        <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
          <legend><strong>2. Sinais Vitais e Avaliação Clínica</strong></legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label htmlFor="systolicBp" style={{ display: 'block', fontSize: 13 }}>PA Sistólica (mmHg)</label>
              <input
                id="systolicBp"
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                placeholder="120"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>PA Diastólica (mmHg)</label>
              <input
                type="number"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                placeholder="80"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Freq. Cardíaca (bpm)</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="75"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Freq. Respiratória (ipm)</label>
              <input
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                placeholder="16"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Temperatura (ºC)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.5"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Sat. Oxigênio (%)</label>
              <input
                type="number"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="98"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Escala de Dor (0 a 10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={painScore}
                onChange={(e) => setPainScore(e.target.value)}
                placeholder="0"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Glasgow (3 a 15)</label>
              <input
                type="number"
                min="3"
                max="15"
                value={glasgowScore}
                onChange={(e) => setGlasgowScore(e.target.value)}
                placeholder="15"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13 }}>Glicemia (mg/dL)</label>
              <input
                type="number"
                min="0"
                value={capillaryGlucose}
                onChange={(e) => setCapillaryGlucose(e.target.value)}
                placeholder="95"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
          </div>
        </fieldset>

        <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
          <legend><strong>3. Protocolo de Manchester & Classificação de Risco</strong></legend>
          <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Fluxograma</label>
              <input
                type="text"
                value={flowchart}
                onChange={(e) => setFlowchart(e.target.value)}
                placeholder="Ex.: Dor Torácica"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Discriminador</label>
              <input
                type="text"
                value={discriminator}
                onChange={(e) => setDiscriminator(e.target.value)}
                placeholder="Ex.: Dor pré-cordial típica"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label htmlFor="riskColor" style={{ display: 'block', marginBottom: 4 }}>Classificação de Risco / Cor Manchester *</label>
            <select
              id="riskColor"
              value={riskColor}
              onChange={(e) => setRiskColor(e.target.value as ManchesterRiskColor)}
              style={{ width: '100%', padding: 8, fontWeight: 'bold' }}
            >
              <option value="red">Vermelho — Emergência (0 min)</option>
              <option value="orange">Laranja — Muito Urgente (10 min)</option>
              <option value="yellow">Amarelo — Urgente (60 min)</option>
              <option value="green">Verde — Pouco Urgente (120 min)</option>
              <option value="blue">Azul — Não Urgente (240 min)</option>
            </select>
          </div>

          <div
            style={{
              padding: 10,
              backgroundColor: selectedManchester.bg,
              color: '#fff',
              borderRadius: 4,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Nível: {selectedManchester.label} | Tempo-Alvo Derivado: {selectedManchester.target}
          </div>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Observações de Triagem</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações de enfermagem..."
              style={{ width: '100%', padding: 8 }}
            />
          </div>
        </fieldset>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => (window.location.hash = '#/atendimentos')}
            style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {isSubmitting ? 'Salvando...' : 'Concluir Triagem'}
          </button>
        </div>
      </form>
    </div>
  );
};
