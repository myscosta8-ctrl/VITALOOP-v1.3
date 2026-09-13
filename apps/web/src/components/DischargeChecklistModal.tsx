import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createDischargeChecklistApi } from '../lib/discharge-checklist-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

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
      {msg && <p data-testid="discharge-checklist-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="discharge-checklist-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-discharge-checklist-btn">
            Registrar Checklist
          </Button>
        </form>
      )}
    </div>
  );
};
