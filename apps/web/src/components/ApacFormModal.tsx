import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSusApi } from '../lib/sus-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface ApacFormModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const ApacFormModal: React.FC<ApacFormModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const { api } = useSession();
  const susApi = createSusApi(api);

  const [mainProcedureCode, setMainProcedureCode] = useState('0301060061');
  const [mainCid10, setMainCid10] = useState('J45.9');
  const [clinicalJustification, setClinicalJustification] = useState(
    'Paciente com quadro de asma persistente necessitando acompanhamento ambulatorial especializado.'
  );
  const [msg, setMsg] = useState('');
  const [compatCheck, setCompatCheck] = useState<string | null>(null);

  const [clinicalFieldsSchema, setClinicalFieldsSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  // Campos administrativos/descritivos que não têm coluna própria (descrição
  // do diagnóstico, dados do solicitante, bloco de autorização, estabelecimento
  // executante) — ver packages/domain/src/sus/apac-clinical-schema.ts.
  // Procedimento SIGTAP/CID/justificativa continuam campos próprios abaixo,
  // porque têm validação de compatibilidade de verdade contra a tabela
  // SIGTAP, mesma lógica já usada pelo AIH.
  useEffect(() => {
    susApi
      .getApacClinicalFieldsSchema()
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
      const res = await susApi.issueApacRequest({
        encounterId,
        patientId,
        mainProcedureCode,
        mainCid10,
        clinicalJustification,
        formFields,
      });
      setMsg(`Laudo de APAC emitido e validado com sucesso! ID: ${res.id}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="apac-form-modal">
      <h3>Laudo para Solicitação/Autorização de Procedimento Ambulatorial (APAC)</h3>
      {msg && <p data-testid="apac-msg">{msg}</p>}
      {compatCheck && <p data-testid="compat-check-msg">{compatCheck}</p>}

      <form onSubmit={handleSubmit} data-testid="apac-form">
        <label>
          Código Procedimento SIGTAP Principal:
          <input
            value={mainProcedureCode}
            onChange={(e) => setMainProcedureCode(e.target.value)}
            data-testid="procedure-code-input"
          />
        </label>

        <label>
          CID-10 Principal:
          <input
            value={mainCid10}
            onChange={(e) => setMainCid10(e.target.value)}
            data-testid="cid10-input"
          />
        </label>

        <label>
          Justificativa Clínica:
          <textarea
            value={clinicalJustification}
            onChange={(e) => setClinicalJustification(e.target.value)}
            data-testid="justification-input"
          />
        </label>

        <button type="button" onClick={handleValidate} data-testid="validate-compat-btn">
          Validar Compatibilidade SIGTAP
        </button>

        {clinicalFieldsSchema && (
          <DynamicClinicalForm schema={clinicalFieldsSchema} values={formFields} onChange={setFormFields} />
        )}

        <button type="submit" data-testid="submit-apac-btn">
          Emitir Laudo APAC
        </button>
      </form>
    </div>
  );
};
