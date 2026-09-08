import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNursingTherapeuticPlanApi } from '../lib/nursing-therapeutic-plan-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

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
      <h3>Projeto Terapêutico Multidisciplinar (Enfermagem)</h3>
      {msg && <p data-testid="nursing-therapeutic-plan-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="nursing-therapeutic-plan-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-nursing-therapeutic-plan-btn">
            Registrar Projeto
          </button>
        </form>
      )}
    </div>
  );
};
