import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPharmacyFollowUpApi } from '../lib/pharmacy-followup-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

interface PharmacyFollowUpModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const PharmacyFollowUpModal: React.FC<PharmacyFollowUpModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const pharmacyFollowUpApi = createPharmacyFollowUpApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    pharmacyFollowUpApi
      .getPharmacyFollowUpSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pharmacyFollowUpApi.createPharmacyFollowUp({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Acompanhamento farmacêutico registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="pharmacy-followup-modal">
      {msg && <p data-testid="pharmacy-followup-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="pharmacy-followup-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-pharmacy-followup-btn">
            Registrar
          </Button>
        </form>
      )}
    </div>
  );
};
