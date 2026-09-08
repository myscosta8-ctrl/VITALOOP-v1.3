import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNutritionApi } from '../lib/nutrition-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface NutritionAssessmentModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const NutritionAssessmentModal: React.FC<NutritionAssessmentModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const nutritionApi = createNutritionApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    nutritionApi
      .getNutritionAssessmentSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nutritionApi.createNutritionAssessment({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Avaliação nutricional registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="nutrition-assessment-modal">
      <h3>Avaliação Nutricional</h3>
      {msg && <p data-testid="nutrition-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="nutrition-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-nutrition-btn">
            Registrar Avaliação
          </button>
        </form>
      )}
    </div>
  );
};
