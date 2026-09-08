import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSocialWorkApi } from '../lib/social-work-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

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
      <h3>Evolução de Serviço Social</h3>
      {msg && <p data-testid="social-work-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="social-work-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-social-work-btn">
            Registrar Avaliação
          </button>
        </form>
      )}
    </div>
  );
};
