import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createHemotherapyApi } from '../lib/hemotherapy-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';
import { Textarea } from './ui/textarea.js';
import { Label } from './ui/label.js';

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
      <p className="mb-3 text-sm text-muted-foreground">
        Encaminhar à Fundação Hemopa conforme classificação de urgência informada abaixo.
      </p>
      {msg && <p data-testid="blood-request-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      {!schema ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="blood-request-form" className="max-w-none space-y-3 border-0 bg-transparent p-0 shadow-none">
          <div className="space-y-1.5">
            <Label htmlFor="blood-request-indication">Indicação Clínica / Cirurgia Proposta *</Label>
            <Textarea
              id="blood-request-indication"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
            />
          </div>

          <DynamicClinicalForm schema={schema} values={formFields} onChange={setFormFields} />

          <Button type="submit" data-testid="submit-blood-request-btn">
            Registrar Solicitação
          </Button>
        </form>
      )}
    </div>
  );
};
