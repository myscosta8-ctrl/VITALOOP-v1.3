import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSbarApi } from '../lib/sbar-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';

interface SbarTransferModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const SbarTransferModal: React.FC<SbarTransferModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const sbarApi = createSbarApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    sbarApi
      .getSbarTransferSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sbarApi.createSbarTransfer({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Transferência interna (SBAR) registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="sbar-transfer-modal">
      {msg && <p data-testid="sbar-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="sbar-form" className="max-w-none border-0 bg-transparent p-0 shadow-none">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" className="mt-4" data-testid="submit-sbar-btn">
            Registrar Transferência
          </Button>
        </form>
      )}
    </div>
  );
};
