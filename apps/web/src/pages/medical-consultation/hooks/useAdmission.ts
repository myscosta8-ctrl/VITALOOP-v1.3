import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import { createAdmissionApi, type Admission, type AdmissionStatus } from '../../../lib/admission-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  reload: () => Promise<void>;
  setAdmission: (a: Admission | null) => void;
}

/**
 * Aba "Internação" — internar, evoluir (diagnóstico/justificativa) e
 * encerrar a internação (handoff 2026-09-12: banco/domínio já prontos,
 * `app.admissions` + gatilho `encounters_guard_admission`, migration 0082).
 * Encerrar aqui só fecha `app.admissions` — o desfecho final do atendimento
 * (`completed`) continua exigindo a aba "Desfecho" (outcomeType
 * 'admission_bed'), chamada depois pelo médico.
 */
export const useAdmission = (api: ApiClient, encounterId: string, deps: Deps) => {
  const admissionApi = createAdmissionApi(api);
  const { reload, setAdmission } = deps;

  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [evolutionJustification, setEvolutionJustification] = useState('');
  const [dischargeStatus, setDischargeStatus] = useState<Extract<AdmissionStatus, 'discharged' | 'transferred_out' | 'deceased'>>('discharged');
  const [dischargeReason, setDischargeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const admission = await admissionApi.createAdmission(encounterId, {
        admissionDiagnosisCode: diagnosisCode.trim() || null,
        admissionDiagnosisDescription: diagnosisDescription.trim(),
        admissionJustification: justification.trim(),
      });
      setAdmission(admission);
      toast.success('Internação registrada — atendimento agora está em status "Internado".');
      setDiagnosisCode('');
      setDiagnosisDescription('');
      setJustification('');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar internação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolutionJustification.trim()) return;
    setSubmitting(true);
    try {
      const admission = await admissionApi.updateAdmission(encounterId, {
        admissionJustification: evolutionJustification.trim(),
      });
      setAdmission(admission);
      toast.success('Evolução da internação registrada.');
      setEvolutionJustification('');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao evoluir internação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const admission = await admissionApi.dischargeAdmission(encounterId, {
        status: dischargeStatus,
        endReason: dischargeReason.trim() || null,
      });
      setAdmission(admission);
      toast.success('Internação encerrada. Registre o desfecho do atendimento na aba "Desfecho" para concluí-lo.');
      setDischargeReason('');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao encerrar internação.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    diagnosisCode, setDiagnosisCode,
    diagnosisDescription, setDiagnosisDescription,
    justification, setJustification,
    evolutionJustification, setEvolutionJustification,
    dischargeStatus, setDischargeStatus,
    dischargeReason, setDischargeReason,
    submitting,
    handleAdmit,
    handleEvolve,
    handleDischarge,
  };
};

export type AdmissionForm = ReturnType<typeof useAdmission>;
