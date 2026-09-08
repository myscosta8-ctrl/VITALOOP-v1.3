import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createTfdApi } from '../lib/tfd-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface TfdRequestModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const TfdRequestModal: React.FC<TfdRequestModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const tfdApi = createTfdApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    tfdApi
      .getTfdRequestSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tfdApi.createTfdRequest({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Laudo de Tratamento Fora de Domicílio (TFD) registrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="tfd-request-modal">
      <h3>Laudo Médico LM/TFD (Tratamento Fora de Domicílio)</h3>
      {msg && <p data-testid="tfd-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="tfd-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-tfd-btn">
            Registrar Laudo
          </button>
        </form>
      )}
    </div>
  );
};
