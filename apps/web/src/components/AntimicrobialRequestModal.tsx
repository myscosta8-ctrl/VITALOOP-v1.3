import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createPharmacyAtmApi } from '../lib/pharmacy-atm-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface AntimicrobialRequestModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const AntimicrobialRequestModal: React.FC<AntimicrobialRequestModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const pharmacyAtmApi = createPharmacyAtmApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    pharmacyAtmApi
      .getAntimicrobialRequestSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pharmacyAtmApi.createAntimicrobialRequest({
        patientId,
        encounterId,
        formFields,
      });
      setMsg('Solicitação de antimicrobiano registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="antimicrobial-request-modal">
      <h3>Formulário Antimicrobiano (ATM)</h3>
      <p>Uso restrito — obrigatório parecer do farmacêutico antes da dispensação.</p>
      {msg && <p data-testid="atm-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="atm-form">
          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-atm-btn">
            Registrar Solicitação
          </button>
        </form>
      )}
    </div>
  );
};
