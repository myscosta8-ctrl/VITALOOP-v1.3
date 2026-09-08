import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSbarApi } from '../lib/sbar-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface SbarTransferModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const SbarTransferModal: React.FC<SbarTransferModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const sbarApi = createSbarApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    sbarApi
      .getSbarTransferSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sbarApi.createSbarTransfer({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Transferência interna (SBAR) registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="sbar-transfer-modal">
      <h3>Transferência Interna de Pacientes (SBAR)</h3>
      {msg && <p data-testid="sbar-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="sbar-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-sbar-btn">
            Registrar Transferência
          </button>
        </form>
      )}
    </div>
  );
};
