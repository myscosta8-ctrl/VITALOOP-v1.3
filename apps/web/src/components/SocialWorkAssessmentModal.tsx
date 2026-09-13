import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSocialWorkApi } from '../lib/social-work-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

interface SocialWorkAssessmentModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const SocialWorkAssessmentModal: React.FC<SocialWorkAssessmentModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const socialWorkApi = createSocialWorkApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    socialWorkApi
      .getSocialWorkAssessmentSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await socialWorkApi.createSocialWorkAssessment({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Evolução de Serviço Social registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="social-work-assessment-modal">
      {msg && <p data-testid="social-work-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="social-work-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-social-work-btn">
            Registrar Avaliação
          </Button>
        </form>
      )}
    </div>
  );
};
