import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNursingTherapeuticPlanApi } from '../lib/nursing-therapeutic-plan-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

interface NursingTherapeuticPlanModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const NursingTherapeuticPlanModal: React.FC<NursingTherapeuticPlanModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const nursingTherapeuticPlanApi = createNursingTherapeuticPlanApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    nursingTherapeuticPlanApi
      .getNursingTherapeuticPlanSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nursingTherapeuticPlanApi.createNursingTherapeuticPlan({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Projeto terapêutico multidisciplinar registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="nursing-therapeutic-plan-modal">
      {msg && <p data-testid="nursing-therapeutic-plan-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="nursing-therapeutic-plan-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-nursing-therapeutic-plan-btn">
            Registrar Projeto
          </Button>
        </form>
      )}
    </div>
  );
};
