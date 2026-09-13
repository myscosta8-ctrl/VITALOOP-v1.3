import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNutritionApi } from '../lib/nutrition-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

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
      {msg && <p data-testid="nutrition-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="nutrition-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-nutrition-btn">
            Registrar Avaliação
          </Button>
        </form>
      )}
    </div>
  );
};
