import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPhysiotherapyApi } from '../lib/physiotherapy-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface PhysiotherapyAssessmentModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const PhysiotherapyAssessmentModal: React.FC<PhysiotherapyAssessmentModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const physiotherapyApi = createPhysiotherapyApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    physiotherapyApi
      .getPhysiotherapyAssessmentSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await physiotherapyApi.createPhysiotherapyAssessment({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Avaliação fisioterapêutica registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="physiotherapy-assessment-modal">
      <h3>Avaliação Fisioterapêutica</h3>
      {msg && <p data-testid="physiotherapy-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="physiotherapy-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-physiotherapy-btn">
            Registrar Avaliação
          </button>
        </form>
      )}
    </div>
  );
};
