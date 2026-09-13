import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSusApi } from '../lib/sus-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Label } from './ui/label.js';

interface AihFormModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const AihFormModal: React.FC<AihFormModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const susApi = createSusApi(api);

  const [mainProcedureCode, setMainProcedureCode] = useState('0303060280');
  const [mainCid10, setMainCid10] = useState('J18.9');
  const [clinicalJustification, setClinicalJustification] = useState(
    'Paciente apresentando dispneia severa e crepitações pulmonares bilaterais necessitando internação para tratamento antibiótico venoso.'
  );
  const [msg, setMsg] = useState('');
  const [compatCheck, setCompatCheck] = useState<string | null>(null);

  const [clinicalFieldsSchema, setClinicalFieldsSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  // Campos clínicos/administrativos que não têm coluna própria (história
  // da doença atual, caráter da internação, médico solicitante/CRM, etc.)
  // — ver packages/domain/src/sus/aih-clinical-schema.ts. Procedimento
  // SIGTAP/CID/justificativa continuam campos próprios abaixo, porque têm
  // validação de compatibilidade de verdade contra a tabela SIGTAP, não
  // uma lista fechada de opções.
  useEffect(() => {
    susApi
      .getAihClinicalFieldsSchema()
      .then(setClinicalFieldsSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  const handleValidate = async () => {
    try {
      const res = await susApi.validateSusCompatibility({
        procedureCode: mainProcedureCode,
        patientAgeMonths: 360,
        patientSex: 'female',
        cid10: mainCid10,
      });
      if (res.isValid) {
        setCompatCheck('Procedimento 100% COMPATÍVEL com as regras do SUS/SIGTAP!');
      } else {
        setCompatCheck(`INCOMPATÍVEL: ${res.errors.join(' ')}`);
      }
    } catch (err: unknown) {
      setCompatCheck((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await susApi.issueAihRequest({
        encounterId,
        patientId,
        mainProcedureCode,
        mainCid10,
        clinicalJustification,
        formFields,
      });
      setMsg(`Laudo de AIH emitido e validado com sucesso! ID: ${res.id}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="aih-form-modal">
      <h3 className="mb-3 text-base font-semibold text-foreground">Laudo para Emissão de AIH / Faturamento SUS (SUS-001..006)</h3>
      {msg && <p data-testid="sus-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}
      {compatCheck && <p data-testid="compat-check-msg" className="mb-3 text-sm font-medium text-foreground">{compatCheck}</p>}

      <form onSubmit={handleSubmit} data-testid="aih-form" className="max-w-none space-y-3 border-0 bg-transparent p-0 shadow-none">
        <div className="space-y-1.5">
          <Label htmlFor="aih-procedure-code">Código Procedimento SIGTAP Principal</Label>
          <Input
            id="aih-procedure-code"
            value={mainProcedureCode}
            onChange={(e) => setMainProcedureCode(e.target.value)}
            data-testid="procedure-code-input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aih-cid10">CID-10 Principal</Label>
          <Input
            id="aih-cid10"
            value={mainCid10}
            onChange={(e) => setMainCid10(e.target.value)}
            data-testid="cid10-input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aih-justification">Justificativa Clínica</Label>
          <Textarea
            id="aih-justification"
            rows={3}
            value={clinicalJustification}
            onChange={(e) => setClinicalJustification(e.target.value)}
            data-testid="justification-input"
          />
        </div>

        <Button type="button" variant="secondary" onClick={handleValidate} data-testid="validate-compat-btn">
          Validar Compatibilidade SIGTAP
        </Button>

        {clinicalFieldsSchema && (
          <DynamicClinicalForm schema={clinicalFieldsSchema} values={formFields} onChange={setFormFields} />
        )}

        <Button type="submit" className="mt-2" data-testid="submit-aih-btn">
          Emitir Laudo AIH
        </Button>
      </form>
    </div>
  );
};
