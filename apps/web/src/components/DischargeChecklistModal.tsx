import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createDischargeChecklistApi } from '../lib/discharge-checklist-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface DischargeChecklistModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const DischargeChecklistModal: React.FC<DischargeChecklistModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const dischargeChecklistApi = createDischargeChecklistApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    dischargeChecklistApi
      .getDischargeChecklistSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dischargeChecklistApi.createDischargeChecklist({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Checklist de alta registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="discharge-checklist-modal">
      <h3>Checklist de Alta</h3>
      {msg && <p data-testid="discharge-checklist-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="discharge-checklist-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-discharge-checklist-btn">
            Registrar Checklist
          </button>
        </form>
      )}
    </div>
  );
};
