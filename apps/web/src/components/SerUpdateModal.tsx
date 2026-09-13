import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSerApi } from '../lib/ser-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

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
      {msg && <p data-testid="ser-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="ser-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-ser-btn">
            Registrar Atualização
          </Button>
        </form>
      )}
    </div>
  );
};
