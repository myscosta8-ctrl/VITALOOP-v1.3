import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createHemotherapyApi } from '../lib/hemotherapy-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface BloodProductRequestModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const BloodProductRequestModal: React.FC<BloodProductRequestModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const hemotherapyApi = createHemotherapyApi(api);

  const [schema, setSchema] = useState<ClinicalFormSchema | null>(null);
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    hemotherapyApi
      .getBloodProductRequestSchema()
      .then(setSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalIndication.trim()) {
      setMsg('A indicação clínica/cirurgia proposta é obrigatória.');
      return;
    }
    try {
      await hemotherapyApi.createBloodProductRequest({
        patientId,
        encounterId,
        clinicalIndication: clinicalIndication.trim(),
        formFields,
      });
      setMsg('Solicitação de sangue/componentes registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="blood-product-request-modal">
      <h3>Solicitação de Sangue, Componentes e Derivados</h3>
      <p>Encaminhar à Fundação Hemopa conforme classificação de urgência informada abaixo.</p>
      {msg && <p data-testid="blood-request-status-msg">{msg}</p>}

      {!schema ? (
        <p role="status">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="blood-request-form">
          <label htmlFor="blood-request-indication" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
            Indicação Clínica / Cirurgia Proposta *
            <textarea
              id="blood-request-indication"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              style={{ width: '100%', padding: 'var(--space-2)' }}
            />
          </label>

          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <button type="submit" data-testid="submit-blood-request-btn">
            Registrar Solicitação
          </button>
        </form>
      )}
    </div>
  );
};
