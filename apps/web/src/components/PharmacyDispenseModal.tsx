import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createIntegrationApi } from '../lib/integration-api.js';

interface PharmacyDispenseModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const PharmacyDispenseModal: React.FC<PharmacyDispenseModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const integrationApi = createIntegrationApi(api);

  const [medicationName, setMedicationName] = useState('Dipirona 500mg IV');
  const [quantity, setQuantity] = useState(2);
  const [msg, setMsg] = useState('');

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await integrationApi.dispensePharmacyMedications(encounterId, patientId, [
        { medicationName, quantity, dosage: '1 ampola IV de 6/6h' },
      ]);
      setMsg(`Dispensação enviada para Farmácia Central! ID: ${res.id}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="pharmacy-dispense-modal">
      <h3>Dispensação Eletrônica — Farmácia Central (INT-004)</h3>
      {msg && <p data-testid="pharmacy-status-msg">{msg}</p>}

      <form onSubmit={handleDispense} data-testid="pharmacy-form">
        <label>
          Medicamento:
          <input
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            data-testid="med-name-input"
          />
        </label>

        <label>
          Quantidade:
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            data-testid="quantity-input"
          />
        </label>

        <button type="submit" data-testid="dispense-btn">
          Solicitar Dispensação na Farmácia
        </button>
      </form>
    </div>
  );
};
