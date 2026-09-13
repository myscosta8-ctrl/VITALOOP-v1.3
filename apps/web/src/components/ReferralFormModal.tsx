import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createReferralFormApi } from '../lib/referral-form-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

interface ReferralFormModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const ReferralFormModal: React.FC<ReferralFormModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const referralFormApi = createReferralFormApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    referralFormApi
      .getReferralFormSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await referralFormApi.createReferralForm({ patientId, encounterId, formFields });
      setMsg('Ficha de referência registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="referral-form-modal">
      {msg && <p data-testid="referral-form-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="referral-form-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-referral-form-btn">
            Registrar Ficha de Referência
          </Button>
        </form>
      )}
    </div>
  );
};
