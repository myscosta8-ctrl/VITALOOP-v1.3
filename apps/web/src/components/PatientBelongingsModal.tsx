import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPatientBelongingsApi } from '../lib/patient-belongings-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface PatientBelongingsModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const PatientBelongingsModal: React.FC<PatientBelongingsModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const patientBelongingsApi = createPatientBelongingsApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    patientBelongingsApi
      .getPatientBelongingsSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await patientBelongingsApi.createPatientBelongings({ patientId, encounterId, formFields });
      setMsg('Inventário de pertences registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="patient-belongings-modal">
      <h3>Inventário de Pertences do Paciente</h3>
      {msg && <p data-testid="patient-belongings-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="patient-belongings-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-patient-belongings-btn">
            Registrar Inventário
          </button>
        </form>
      )}
    </div>
  );
};
