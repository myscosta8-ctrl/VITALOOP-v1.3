import React, { useState } from 'react';
import { dispensePharmacyMedications, exportAihBatch, sendRndsBundle } from '../lib/integration-api.js';

interface InteroperabilityStep2PanelProps {
  encounterId: string;
  patientId: string;
  aihId?: string | undefined;
}

export const InteroperabilityStep2Panel: React.FC<InteroperabilityStep2PanelProps> = ({
  encounterId,
  patientId,
  aihId,
}) => {
  const [medicationName, setMedicationName] = useState('Dipirona 500mg IV');
  const [quantity, setQuantity] = useState(2);
  const [patientCns, setPatientCns] = useState('700000000000001');
  const [msg, setMsg] = useState('');

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dispensePharmacyMedications(encounterId, patientId, [
        { medicationName, quantity, dosage: '1 ampola IV de 6/6h' },
      ]);
      setMsg(`Dispensação enviada para Farmácia Central! ID: ${res.data.id}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleExportAihBatch = async () => {
    if (!aihId) {
      setMsg('Nenhum ID de AIH disponível para exportação.');
      return;
    }
    try {
      const res = await exportAihBatch([aihId]);
      setMsg(`Lote de AIH exportado com sucesso! N° Lote: ${res.data.batchNumber}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleSendRnds = async () => {
    try {
      const res = await sendRndsBundle(patientCns, encounterId, 'Atendimento de emergência finalizado com sucesso');
      setMsg(`Pacote FHIR enviado para o barramento RNDS/DATASUS com sucesso! ID: ${res.data.id}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="step2-interop-panel">
      <h3>Barramento de Farmácia, Regulação SISREG/CROSS, RNDS e AIH (INT-004..008)</h3>
      {msg && <p data-testid="step2-status-msg">{msg}</p>}

      <section>
        <h4>1. Integração Farmácia Central / Dispensação Eletrônica (INT-004)</h4>
        <form onSubmit={handleDispense} data-testid="pharmacy-form">
          <input
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            data-testid="med-name-input"
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            data-testid="quantity-input"
          />
          <button type="submit" data-testid="dispense-btn">
            Solicitar Dispensação na Farmácia
          </button>
        </form>
      </section>

      <section style={{ marginTop: '15px' }}>
        <h4>2. Conectividade RNDS / DATASUS (INT-006)</h4>
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
          <h4>3. Exportação de Lote Estruturado de AIHs (INT-007)</h4>
          <button type="button" onClick={handleExportAihBatch} data-testid="export-aih-batch-btn">
            Gerar e Exportar Lote de AIH
          </button>
        </section>
      )}
    </div>
  );
};
