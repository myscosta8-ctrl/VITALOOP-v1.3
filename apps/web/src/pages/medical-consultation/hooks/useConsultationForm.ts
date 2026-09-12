import { useEffect, useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import { createMedicalApi, type MedicalConsultation, type SegmentalExam } from '../../../lib/medical-api.js';
import type { Triage } from '../../../lib/triages-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  triage: Triage | null;
  existingConsultation: MedicalConsultation | null;
  setExistingConsultation: (c: MedicalConsultation) => void;
  reload: () => Promise<void>;
}

/** Aba "Consulta Médica" — anamnese/exame físico (registro único) + evoluções sequenciais. */
export const useConsultationForm = (api: ApiClient, encounterId: string, deps: Deps) => {
  const medicalApi = createMedicalApi(api);
  const { triage, existingConsultation, setExistingConsultation, reload } = deps;

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyPresentIllness, setHistoryPresentIllness] = useState('');
  const [pastMedicalHistory, setPastMedicalHistory] = useState('');
  const [systemReview, setSystemReview] = useState('');
  const [generalExam, setGeneralExam] = useState('');

  const [cvExam, setCvExam] = useState('');
  const [respExam, setRespExam] = useState('');
  const [abdExam, setAbdExam] = useState('');
  const [neuroExam, setNeuroExam] = useState('');
  const [extExam, setExtExam] = useState('');

  const [diagnosticHypothesis, setDiagnosticHypothesis] = useState('');
  const [initialConduct, setInitialConduct] = useState('');

  const [evolutionText, setEvolutionText] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState('estável');

  const [submitting, setSubmitting] = useState(false);

  // Pré-preenche a queixa principal com a da triagem, quando ela chegar
  // (mesmo comportamento do MedicalConsultationPage.tsx original).
  useEffect(() => {
    if (triage?.chiefComplaint) setChiefComplaint(triage.chiefComplaint);
  }, [triage]);

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chiefComplaint.trim()) { toast.error('A queixa principal é obrigatória.'); return; }
    if (!historyPresentIllness.trim()) { toast.error('A História da Moléstia Atual (HMA) é obrigatória.'); return; }
    if (!generalExam.trim()) { toast.error('O Exame Físico Geral é obrigatório.'); return; }
    if (!diagnosticHypothesis.trim()) { toast.error('A Hipótese Diagnóstica clínica é obrigatória.'); return; }

    const segmentalExam: SegmentalExam = {
      cardiovascular: cvExam.trim() || null,
      respiratory: respExam.trim() || null,
      abdomen: abdExam.trim() || null,
      neurological: neuroExam.trim() || null,
      extremities: extExam.trim() || null,
    };

    setSubmitting(true);
    try {
      const created = await medicalApi.createConsultation(encounterId, {
        chiefComplaint: chiefComplaint.trim(),
        historyPresentIllness: historyPresentIllness.trim(),
        pastMedicalHistory: pastMedicalHistory.trim() || null,
        systemReview: systemReview.trim() || null,
        generalExam: generalExam.trim(),
        segmentalExam,
        diagnosticHypothesis: diagnosticHypothesis.trim(),
        initialConduct: initialConduct.trim() || null,
      });

      setExistingConsultation(created);
      toast.success('Consulta médica registrada com sucesso!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar consulta médica.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolutionText.trim()) { toast.error('Informe o texto da evolução médica.'); return; }

    setSubmitting(true);
    try {
      await medicalApi.createEvolution(encounterId, {
        evolutionText: evolutionText.trim(),
        clinicalStatus: clinicalStatus.trim() || null,
      });

      setEvolutionText('');
      toast.success('Evolução médica adicionada com sucesso!');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar evolução médica.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    chiefComplaint, setChiefComplaint,
    historyPresentIllness, setHistoryPresentIllness,
    pastMedicalHistory, setPastMedicalHistory,
    systemReview, setSystemReview,
    generalExam, setGeneralExam,
    cvExam, setCvExam,
    respExam, setRespExam,
    abdExam, setAbdExam,
    neuroExam, setNeuroExam,
    extExam, setExtExam,
    diagnosticHypothesis, setDiagnosticHypothesis,
    initialConduct, setInitialConduct,
    evolutionText, setEvolutionText,
    clinicalStatus, setClinicalStatus,
    submitting,
    existingConsultation,
    handleSubmitConsultation,
    handleAddEvolution,
  };
};

export type ConsultationForm = ReturnType<typeof useConsultationForm>;
