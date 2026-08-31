import React, { useState } from 'react';
import { issueAihRequest, validateSusCompatibility } from '../lib/sus-api.js';

interface AihFormModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const AihFormModal: React.FC<AihFormModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const [mainProcedureCode, setMainProcedureCode] = useState('0303060280');
  const [mainCid10, setMainCid10] = useState('J18.9');
  const [clinicalJustification, setClinicalJustification] = useState(
    'Paciente apresentando dispneia severa e crepitações pulmonares bilaterais necessitando internação para tratamento antibiótico venoso.'
  );
  const [msg, setMsg] = useState('');
  const [compatCheck, setCompatCheck] = useState<string | null>(null);

  const handleValidate = async () => {
    try {
      const res = await validateSusCompatibility({
        procedureCode: mainProcedureCode,
        patientAgeMonths: 360,
        patientSex: 'female',
        cid10: mainCid10,
      });
      if (res.data.isValid) {
        setCompatCheck('Procedimento 100% COMPATÍVEL com as regras do SUS/SIGTAP!');
      } else {
        setCompatCheck(`INCOMPATÍVEL: ${res.data.errors.join(' ')}`);
      }
    } catch (err: unknown) {
      setCompatCheck((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await issueAihRequest({
        encounterId,
        patientId,
        mainProcedureCode,
        mainCid10,
        clinicalJustification,
      });
      setMsg(`Laudo de AIH emitido e validado com sucesso! ID: ${res.data.id}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="aih-form-modal">
      <h3>Laudo para Emissão de AIH / Faturamento SUS (SUS-001..006)</h3>
      {msg && <p data-testid="sus-msg">{msg}</p>}
      {compatCheck && <p data-testid="compat-check-msg">{compatCheck}</p>}

      <form onSubmit={handleSubmit} data-testid="aih-form">
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

        <button type="submit" data-testid="submit-aih-btn">
          Emitir Laudo AIH
        </button>
      </form>
    </div>
  );
};
