import React, { useState } from 'react';
import { createNursingSae, applyNursingScale, recordFluidBalance, insertInvasiveDevice } from '../lib/nursing-sae-api.js';

interface NursingSaeViewProps {
  encounterId: string;
}

export const NursingSaeView: React.FC<NursingSaeViewProps> = ({ encounterId }) => {
  const [diagTitle, setDiagTitle] = useState('');
  const [careDesc, setCareDesc] = useState('');
  const [volumeMl, setVolumeMl] = useState(250);
  const [fluidDirection, setFluidDirection] = useState<'intake' | 'output'>('intake');
  const [deviceSite, setDeviceSite] = useState('');
  const [msg, setMsg] = useState('');

  const handleSaveSae = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNursingSae(encounterId, {
        diagnoses: [{ code: 'NANDA-00047', title: diagTitle || 'Risco de Lesão por Pressão' }],
        prescriptions: [{ careDescription: careDesc || 'Mudança de decúbito 2 em 2 horas' }],
      });
      setMsg('SAE registrada com sucesso.');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleApplyBraden = async () => {
    try {
      const res = await applyNursingScale(encounterId, {
        scaleType: 'braden',
        scoreDetails: { sensory: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction: 1 },
      });
      setMsg(`Escala de Braden aplicada. Escore: ${res.data.total_score} (Risco: ${res.data.risk_level})`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleSaveFluid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordFluidBalance(encounterId, {
        direction: fluidDirection,
        fluidType: fluidDirection === 'intake' ? 'intravenous' : 'urine',
        volumeMl: Number(volumeMl),
      });
      setMsg('Balanço hídrico registrado com sucesso.');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await insertInvasiveDevice(encounterId, {
        deviceType: 'peripheral_venous_access',
        anatomicalSite: deviceSite || 'Antebraço Direito',
      });
      setMsg('Dispositivo invasivo inserido com sucesso.');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="nursing-sae-view">
      <h3>Sistematização da Assistência de Enfermagem (SAE & Escalas)</h3>
      {msg && <p data-testid="sae-msg">{msg}</p>}

      <form onSubmit={handleSaveSae} data-testid="sae-form">
        <h4>1. Diagnósticos e Cuidados (NUR-004..006)</h4>
        <input
          placeholder="Título do Diagnóstico"
          value={diagTitle}
          onChange={(e) => setDiagTitle(e.target.value)}
        />
        <input
          placeholder="Descrição do Cuidado Prescrito"
          value={careDesc}
          onChange={(e) => setCareDesc(e.target.value)}
        />
        <button type="submit">Salvar SAE</button>
      </form>

      <div>
        <h4>2. Escalas Assistenciais (NUR-010)</h4>
        <button type="button" onClick={handleApplyBraden} data-testid="apply-braden-btn">
          Aplicar Escala de Braden
        </button>
      </div>

      <form onSubmit={handleSaveFluid} data-testid="fluid-form">
        <h4>3. Balanço Hídrico (NUR-009)</h4>
        <select value={fluidDirection} onChange={(e) => setFluidDirection(e.target.value as 'intake' | 'output')}>
          <option value="intake">Entrada (Intake)</option>
          <option value="output">Saída (Output)</option>
        </select>
        <input
          type="number"
          value={volumeMl}
          onChange={(e) => setVolumeMl(Number(e.target.value))}
        />
        <button type="submit">Registrar Balanço</button>
      </form>

      <form onSubmit={handleSaveDevice} data-testid="device-form">
        <h4>4. Dispositivos Invasivos (NUR-011)</h4>
        <input
          placeholder="Sítio Anatômico"
          value={deviceSite}
          onChange={(e) => setDeviceSite(e.target.value)}
        />
        <button type="submit">Inserir Dispositivo</button>
      </form>
    </div>
  );
};
