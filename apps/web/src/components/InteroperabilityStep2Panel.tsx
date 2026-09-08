import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createIntegrationApi } from '../lib/integration-api.js';

interface InteroperabilityStep2PanelProps {
  encounterId: string;
  aihId?: string | undefined;
}

export const InteroperabilityStep2Panel: React.FC<InteroperabilityStep2PanelProps> = ({
  encounterId,
  aihId,
}) => {
  const { api } = useSession();
  const integrationApi = createIntegrationApi(api);

  const [patientCns, setPatientCns] = useState('700000000000001');
  const [msg, setMsg] = useState('');

  const handleExportAihBatch = async () => {
    if (!aihId) {
      setMsg('Nenhum ID de AIH disponível para exportação.');
      return;
    }
    try {
      const res = await integrationApi.exportAihBatch([aihId]);
      setMsg(`Lote de AIH exportado com sucesso! N° Lote: ${res.batchNumber}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleSendRnds = async () => {
    try {
      const res = await integrationApi.sendRndsBundle(patientCns, encounterId, 'Atendimento de emergência finalizado com sucesso');
      setMsg(`Pacote FHIR enviado para o barramento RNDS/DATASUS com sucesso! ID: ${res.id}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="step2-interop-panel">
      <h3>Barramento RNDS e Exportação de Lote de AIH (INT-006..007)</h3>
      {msg && <p data-testid="step2-status-msg">{msg}</p>}

      <section>
        <h4>1. Conectividade RNDS / DATASUS (INT-006)</h4>
        <input
          value={patientCns}
          onChange={(e) => setPatientCns(e.target.value)}
          data-testid="cns-input"
        />
        <button type="button" onClick={handleSendRnds} data-testid="send-rnds-btn">
          Enviar Sumário para RNDS
        </button>
      </section>

      {aihId && (
        <section style={{ marginTop: '15px' }}>
          <h4>2. Exportação de Lote Estruturado de AIHs (INT-007)</h4>
          <button type="button" onClick={handleExportAihBatch} data-testid="export-aih-batch-btn">
            Gerar e Exportar Lote de AIH
          </button>
        </section>
      )}
    </div>
  );
};
