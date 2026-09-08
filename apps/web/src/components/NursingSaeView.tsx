import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNursingSaeApi } from '../lib/nursing-sae-api.js';

interface NursingSaeViewProps {
  encounterId: string;
}

export const NursingSaeView: React.FC<NursingSaeViewProps> = ({ encounterId }) => {
  const { api } = useSession();
  const nursingSaeApi = createNursingSaeApi(api);

  const [diagTitle, setDiagTitle] = useState('');
  const [careDesc, setCareDesc] = useState('');
  const [deviceSite, setDeviceSite] = useState('');
  const [msg, setMsg] = useState('');

  const handleSaveSae = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nursingSaeApi.createNursingSae(encounterId, {
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
      const res = await nursingSaeApi.applyNursingScale(encounterId, {
        scaleType: 'braden',
        scoreDetails: { sensory: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction: 1 },
      });
      setMsg(`Escala de Braden aplicada. Escore: ${res.total_score} (Risco: ${res.risk_level})`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nursingSaeApi.insertInvasiveDevice(encounterId, {
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

      <p>
        <em>Balanço Hídrico: ver tela dedicada "Balanço Hídrico" na central de ações do atendimento (NUR-009).</em>
      </p>

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
