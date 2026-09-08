import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSerApi } from '../lib/ser-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface SerUpdateModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const SerUpdateModal: React.FC<SerUpdateModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const serApi = createSerApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    serApi
      .getSerUpdateSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await serApi.createSerUpdate({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Atualização de quadro clínico (SER) registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="ser-update-modal">
      <h3>Atualização de Quadro Clínico de Paciente Regulado (SER)</h3>
      {msg && <p data-testid="ser-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="ser-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-ser-btn">
            Registrar Atualização
          </button>
        </form>
      )}
    </div>
  );
};
