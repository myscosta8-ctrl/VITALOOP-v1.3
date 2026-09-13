import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPhysiotherapyApi } from '../lib/physiotherapy-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

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
      {msg && <p data-testid="physiotherapy-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="physiotherapy-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-physiotherapy-btn">
            Registrar Avaliação
          </Button>
        </form>
      )}
    </div>
  );
};
