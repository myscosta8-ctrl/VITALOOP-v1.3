import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNursingAdmissionApi } from '../lib/nursing-admission-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface NursingAdmissionFormModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const NursingAdmissionFormModal: React.FC<NursingAdmissionFormModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const nursingAdmissionApi = createNursingAdmissionApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    nursingAdmissionApi
      .getNursingAdmissionFormSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await nursingAdmissionApi.createNursingAdmissionForm({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Ficha de enfermagem registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="nursing-admission-form-modal">
      <h3>Ficha de Atendimento de Enfermagem</h3>
      {msg && <p data-testid="nursing-admission-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="nursing-admission-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-nursing-admission-btn">
            Registrar Ficha de Enfermagem
          </button>
        </form>
      )}
    </div>
  );
};
