import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createTherapeuticPlanApi } from '../lib/therapeutic-plan-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface TherapeuticPlanModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const TherapeuticPlanModal: React.FC<TherapeuticPlanModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const therapeuticPlanApi = createTherapeuticPlanApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    therapeuticPlanApi
      .getTherapeuticPlanSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await therapeuticPlanApi.createTherapeuticPlan({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Plano terapêutico registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="therapeutic-plan-modal">
      <h3>Plano Terapêutico</h3>
      {msg && <p data-testid="therapeutic-plan-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="therapeutic-plan-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-therapeutic-plan-btn">
            Registrar Plano
          </button>
        </form>
      )}
    </div>
  );
};
