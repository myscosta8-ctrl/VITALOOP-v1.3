import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createMedicalApi, type MedicalConsultation, type SegmentalExam } from '../lib/medical-api.js';
import { createTriagesApi, type Triage } from '../lib/triages-api.js';
import { createDiagnosesApi, type CidItem, type EncounterDiagnosis, type DiagnosisType, type DiagnosisStatus } from '../lib/diagnoses-api.js';
import { createPrescriptionsApi, type Prescription, type MedicationItem, type RouteOfAdministration, type PrescriptionItemPayload } from '../lib/prescriptions-api.js';
import { createExamsApi, type ExamCatalogItem, type ExamRequest, type ProcedureRequest, type Interconsultation, type InterconsultationPriority } from '../lib/exams-api.js';
import { createOutcomesApi, type EncounterOutcome, type EncounterSummary, type OutcomeType } from '../lib/outcomes-api.js';
import { CidSearchInput } from '../components/CidSearchInput.js';
import { MedicationSearchInput } from '../components/MedicationSearchInput.js';
import { ExamSearchInput } from '../components/ExamSearchInput.js';
import { MedicalSummaryView } from '../components/MedicalSummaryView.js';
import { MANCHESTER_BADGE_STYLE } from './QueueDashboardPage.js';

interface Props {
  encounterId: string;
}

export const MedicalConsultationPage: React.FC<Props> = ({ encounterId }) => {
  const { api } = useSession();
  const medicalApi = createMedicalApi(api);
  const triagesApi = createTriagesApi(api);
  const diagnosesApi = createDiagnosesApi(api);
  const prescriptionsApi = createPrescriptionsApi(api);
  const examsApi = createExamsApi(api);
  const outcomesApi = createOutcomesApi(api);

  const [triage, setTriage] = useState<Triage | null>(null);
  const [existingConsultation, setExistingConsultation] = useState<MedicalConsultation | null>(null);
  const [diagnoses, setDiagnoses] = useState<readonly EncounterDiagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<readonly Prescription[]>([]);
  const [examRequests, setExamRequests] = useState<readonly ExamRequest[]>([]);
  const [procedureRequests, setProcedureRequests] = useState<readonly ProcedureRequest[]>([]);
  const [interconsultations, setInterconsultations] = useState<readonly Interconsultation[]>([]);
  const [outcome, setOutcome] = useState<EncounterOutcome | null>(null);
  const [summary, setSummary] = useState<EncounterSummary | null>(null);

  // Consulta campos
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

  // Evolução campos
  const [evolutionText, setEvolutionText] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState('estável');

  // Diagnóstico campos
  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [diagType, setDiagType] = useState<DiagnosisType>('principal');
  const [diagNotes, setDiagNotes] = useState('');
  const [refutingDiagId, setRefutingDiagId] = useState<string | null>(null);
  const [refutationNotes, setRefutationNotes] = useState('');

  // Prescrição campos
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemPayload[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);
  const [itemDose, setItemDose] = useState<number>(1);
  const [itemDoseUnit, setItemDoseUnit] = useState<string>('comprimido');
  const [itemRoute, setItemRoute] = useState<RouteOfAdministration>('VO');
  const [itemFrequency, setItemFrequency] = useState<string>('6/6h');
  const [itemDuration, setItemDuration] = useState<string>('5 dias');
  const [itemInstructions, setItemInstructions] = useState<string>('');

  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [showAllergyModal, setShowAllergyModal] = useState<boolean>(false);
  const [allergyModalMessage, setAllergyModalMessage] = useState<string>('');

  const [cancelingPrescId, setCancelingPrescId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Exames campos
  const [selectedExamItem, setSelectedExamItem] = useState<ExamCatalogItem | null>(null);
  const [examClinicalIndication, setExamClinicalIndication] = useState('');
  const [recordingResultExamId, setRecordingResultExamId] = useState<string | null>(null);
  const [examResultSummary, setExamResultSummary] = useState('');

  // Procedimentos campos
  const [procedureNameInput, setProcedureNameInput] = useState('');
  const [procedureInstructionsInput, setProcedureInstructionsInput] = useState('');

  // Interconsulta campos
  const [interSpecialty, setInterSpecialty] = useState('Cardiologia');
  const [interPriority, setInterPriority] = useState<InterconsultationPriority>('routine');
  const [interClinicalSummary, setInterClinicalSummary] = useState('');
  const [interQuestion, setInterQuestion] = useState('');
  const [respondingInterId, setRespondingInterId] = useState<string | null>(null);
  const [interResponseNotes, setInterResponseNotes] = useState('');

  // Desfecho campos
  const [selectedOutcomeType, setSelectedOutcomeType] = useState<OutcomeType>('medical_discharge');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [destinationUnit, setDestinationUnit] = useState('');
  const [dischargeInstructions, setDischargeInstructions] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConsultationAllData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      try {
        const triData = await triagesApi.getTriage(encounterId);
        setTriage(triData);
        if (triData.chiefComplaint) {
          setChiefComplaint(triData.chiefComplaint);
        }
      } catch {
        /* sem triagem */
      }

      try {
        const consData = await medicalApi.getConsultation(encounterId);
        setExistingConsultation(consData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setExistingConsultation(null);
        } else throw err;
      }

      try { setDiagnoses(await diagnosesApi.getDiagnoses(encounterId)); } catch { setDiagnoses([]); }
      try { setPrescriptions(await prescriptionsApi.getPrescriptions(encounterId)); } catch { setPrescriptions([]); }
      try { setExamRequests(await examsApi.getExamRequests(encounterId)); } catch { setExamRequests([]); }
      try { setProcedureRequests(await examsApi.getProcedureRequests(encounterId)); } catch { setProcedureRequests([]); }
      try { setInterconsultations(await examsApi.getInterconsultations(encounterId)); } catch { setInterconsultations([]); }

      try { setOutcome(await outcomesApi.getOutcome(encounterId)); } catch { setOutcome(null); }
      try { setSummary(await outcomesApi.getSummary(encounterId)); } catch { setSummary(null); }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar prontuário médico.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [api, encounterId]);

  useEffect(() => {
    fetchConsultationAllData();
  }, [fetchConsultationAllData]);

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!chiefComplaint.trim()) { setErrorMessage('A queixa principal é obrigatória.'); return; }
    if (!historyPresentIllness.trim()) { setErrorMessage('A História da Moléstia Atual (HMA) é obrigatória.'); return; }
    if (!generalExam.trim()) { setErrorMessage('O Exame Físico Geral é obrigatório.'); return; }
    if (!diagnosticHypothesis.trim()) { setErrorMessage('A Hipótese Diagnóstica clínica é obrigatória.'); return; }

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
      setSuccessMessage('Consulta médica registrada com sucesso!');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao registrar consulta médica.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolutionText.trim()) { setErrorMessage('Informe o texto da evolução médica.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await medicalApi.createEvolution(encounterId, {
        evolutionText: evolutionText.trim(),
        clinicalStatus: clinicalStatus.trim() || null,
      });

      setEvolutionText('');
      setSuccessMessage('Evolução médica adicionada com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao registrar evolução médica.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCid) { setErrorMessage('Selecione um código CID-10 no catálogo.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await diagnosesApi.createDiagnosis(encounterId, {
        cidCode: selectedCid.code,
        diagnosisType: diagType,
        notes: diagNotes.trim() || null,
      });

      setSelectedCid(null);
      setDiagNotes('');
      setSuccessMessage(`Diagnóstico CID-10 [${selectedCid.code}] adicionado com sucesso!`);
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao adicionar diagnóstico.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDiagnosisStatus = async (diagnosisId: string, status: DiagnosisStatus) => {
    if (status === 'refuted' && !refutationNotes.trim()) {
      setErrorMessage('A justificativa é obrigatória para refutar um diagnóstico.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await diagnosesApi.updateDiagnosisStatus(encounterId, diagnosisId, {
        status,
        notes: status === 'refuted' ? refutationNotes.trim() : null,
      });

      setRefutingDiagId(null);
      setRefutationNotes('');
      setSuccessMessage('Situação do diagnóstico atualizada com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao atualizar situação do diagnóstico.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItemToPrescription = () => {
    if (!selectedMedication) { setErrorMessage('Selecione um medicamento no catálogo.'); return; }
    if (itemDose <= 0) { setErrorMessage('A dose deve ser maior que zero.'); return; }

    const newItem: PrescriptionItemPayload = {
      medicationId: selectedMedication.id,
      medicationName: selectedMedication.name,
      activeSubstance: selectedMedication.activeSubstance,
      dose: itemDose,
      doseUnit: itemDoseUnit.trim(),
      route: itemRoute,
      frequency: itemFrequency.trim(),
      duration: itemDuration.trim() || null,
      instructions: itemInstructions.trim() || null,
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setSelectedMedication(null);
    setItemInstructions('');
    setErrorMessage(null);
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionItems.length === 0) { setErrorMessage('Adicione pelo menos um medicamento à prescrição.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await prescriptionsApi.createPrescription(encounterId, {
        items: prescriptionItems,
        overrideJustification: overrideJustification.trim() || null,
      });

      setPrescriptionItems([]);
      setOverrideJustification('');
      setShowAllergyModal(false);
      setSuccessMessage('Prescrição médica gerada e ativada com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALLERGY_ALERT_REQUIRES_JUSTIFICATION') {
        setAllergyModalMessage(err.message);
        setShowAllergyModal(true);
      } else {
        const msg = err instanceof ApiError ? err.message : 'Erro ao registrar prescrição médica.';
        setErrorMessage(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    if (!cancelReason.trim()) { setErrorMessage('O motivo do cancelamento é obrigatório.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await prescriptionsApi.cancelPrescription(encounterId, prescriptionId, {
        cancelReason: cancelReason.trim(),
      });

      setCancelingPrescId(null);
      setCancelReason('');
      setSuccessMessage('Prescrição médica cancelada com sucesso.');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao cancelar prescrição médica.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExamRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamItem) { setErrorMessage('Selecione um exame no catálogo.'); return; }
    if (!examClinicalIndication.trim() || examClinicalIndication.trim().length < 5) {
      setErrorMessage('Informe uma indicação clínica detalhada para o exame (mínimo 5 caracteres).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.createExamRequest(encounterId, {
        examId: selectedExamItem.id,
        examName: selectedExamItem.name,
        examType: selectedExamItem.type,
        clinicalIndication: examClinicalIndication.trim(),
      });

      setSelectedExamItem(null);
      setExamClinicalIndication('');
      setSuccessMessage('Exame solicitado com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar exame.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExamResult = async (examRequestId: string) => {
    if (!examResultSummary.trim()) { setErrorMessage('Informe o resultado/laudo do exame.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.recordExamResult(encounterId, examRequestId, {
        resultSummary: examResultSummary.trim(),
      });

      setRecordingResultExamId(null);
      setExamResultSummary('');
      setSuccessMessage('Resultado do exame lançado com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao lançar resultado do exame.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProcedureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureNameInput.trim()) { setErrorMessage('Informe o nome do procedimento ambulatorial.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.createProcedureRequest(encounterId, {
        procedureName: procedureNameInput.trim(),
        instructions: procedureInstructionsInput.trim() || null,
      });

      setProcedureNameInput('');
      setProcedureInstructionsInput('');
      setSuccessMessage('Procedimento solicitado com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar procedimento.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteProcedure = async (procedureRequestId: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.executeProcedure(encounterId, procedureRequestId, { notes: 'Executado com sucesso' });
      setSuccessMessage('Procedimento marcado como executado/concluído!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao concluir procedimento.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInterconsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interClinicalSummary.trim()) { setErrorMessage('Informe o resumo clínico do caso para a interconsulta.'); return; }
    if (!interQuestion.trim()) { setErrorMessage('Informe a dúvida/quesito técnico para a interconsulta.'); return; }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.createInterconsultation(encounterId, {
        specialty: interSpecialty,
        priority: interPriority,
        clinicalSummary: interClinicalSummary.trim(),
        question: interQuestion.trim(),
      });

      setInterClinicalSummary('');
      setInterQuestion('');
      setSuccessMessage('Solicitação de parecer de interconsulta enviada com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar interconsulta.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondInterconsultation = async (interconsultationId: string) => {
    if (!interResponseNotes.trim() || interResponseNotes.trim().length < 10) {
      setErrorMessage('Informe o parecer técnico completo do especialista (mínimo 10 caracteres).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await examsApi.respondInterconsultation(encounterId, interconsultationId, {
        responseNotes: interResponseNotes.trim(),
      });

      setRespondingInterId(null);
      setInterResponseNotes('');
      setSuccessMessage('Parecer de interconsulta médica registrado com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao responder interconsulta.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handler de Desfecho Assistencial (Fase 3, Etapa 6/6)
  const handleCreateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await outcomesApi.createOutcome(encounterId, {
        outcomeType: selectedOutcomeType,
        notes: outcomeNotes.trim() || null,
        destinationUnit: destinationUnit.trim() || null,
        dischargeInstructions: dischargeInstructions.trim() || null,
      });

      setOutcome(res.outcome);
      setSummary(res.summary);
      setSuccessMessage('Desfecho assistencial registrado e atendimento encerrado com sucesso!');
      await fetchConsultationAllData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao registrar desfecho assistencial.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Carregando prontuário médico...</div>;
  }

  return (
    <div style={{ maxWidth: 950, margin: '20px auto', padding: 20, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2>Consulta Médica de UPA (Prontuário Assistencial)</h2>

      {triage && (
        <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Dados da Triagem & Sinais Vitais</h4>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 'bold' }}>Classificação Manchester:</span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontWeight: 'bold',
                color: MANCHESTER_BADGE_STYLE[triage.riskColor].text,
                backgroundColor: MANCHESTER_BADGE_STYLE[triage.riskColor].bg,
              }}
            >
              {MANCHESTER_BADGE_STYLE[triage.riskColor].label}
            </span>
          </div>
          {triage.vitals && (
            <div style={{ fontSize: 13, color: '#334155', display: 'flex', gap: 15, flexWrap: 'wrap' }}>
              <span><strong>PA:</strong> {triage.vitals.systolicBp}/{triage.vitals.diastolicBp} mmHg</span>
              <span><strong>FC:</strong> {triage.vitals.heartRate} bpm</span>
              <span><strong>FR:</strong> {triage.vitals.respiratoryRate} ipm</span>
              <span><strong>Temp:</strong> {triage.vitals.temperature} ºC</span>
              <span><strong>SpO2:</strong> {triage.vitals.oxygenSaturation} %</span>
              {triage.painScore !== undefined && <span><strong>Dor:</strong> {triage.painScore}/10</span>}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: 10, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 15 }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: 10, backgroundColor: '#dcfce7', color: '#166534', borderRadius: 4, marginBottom: 15 }}>
          {successMessage}
        </div>
      )}

      {existingConsultation ? (
        <div>
          <div style={{ padding: 15, backgroundColor: '#f1f5f9', borderRadius: 6, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Consulta Médica Registrada</h3>
            <p><strong>Queixa Principal:</strong> {existingConsultation.chiefComplaint}</p>
            <p><strong>HMA:</strong> {existingConsultation.historyPresentIllness}</p>
            {existingConsultation.pastMedicalHistory && <p><strong>Antecedentes:</strong> {existingConsultation.pastMedicalHistory}</p>}
            <p><strong>Exame Físico Geral:</strong> {existingConsultation.generalExam}</p>
            <p><strong>Hipótese Diagnóstica:</strong> {existingConsultation.diagnosticHypothesis}</p>
            {existingConsultation.initialConduct && <p><strong>Conduta Inicial:</strong> {existingConsultation.initialConduct}</p>}
          </div>

          {/* ---------- SEÇÃO DE DIAGNÓSTICOS CLÍNICOS & CID-10 (MED-005, MED-006) ---------- */}
          <div style={{ marginTop: 20, borderTop: '2px solid #2563eb', paddingTop: 15, marginBottom: 20 }}>
            <h4 style={{ color: '#1e40af' }}>Diagnósticos Clínicos e Catálogo CID-10 (MED-005, MED-006)</h4>

            <div style={{ marginBottom: 15 }}>
              <h5>Diagnósticos Registrados no Atendimento</h5>
              {diagnoses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {diagnoses.map((diag) => (
                    <div
                      key={diag.id}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        borderLeft: diag.diagnosisType === 'principal' ? '6px solid #dc2626' : '6px solid #64748b',
                        backgroundColor: diag.status === 'refuted' ? '#fecdd3' : '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              marginRight: 8,
                              backgroundColor: diag.diagnosisType === 'principal' ? '#fee2e2' : '#e2e8f0',
                              color: diag.diagnosisType === 'principal' ? '#991b1b' : '#334155',
                            }}
                          >
                            {diag.diagnosisType === 'principal' ? 'Diagnóstico Principal' : 'Diagnóstico Secundário'}
                          </span>
                          <strong style={{ color: '#0f172a', fontSize: 15 }}>[{diag.cidCode}]</strong>{' '}
                          <span style={{ fontSize: 14 }}>{diag.cidDescription || ''}</span>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                            backgroundColor: diag.status === 'active' ? '#dcfce7' : diag.status === 'resolved' ? '#e0f2fe' : '#ffe4e6',
                            color: diag.status === 'active' ? '#166534' : diag.status === 'resolved' ? '#0369a1' : '#9f1239',
                          }}
                        >
                          {diag.status === 'active' ? 'Ativo' : diag.status === 'resolved' ? 'Resolvido' : 'Refutado'}
                        </span>
                      </div>
                      {diag.notes && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Nota: {diag.notes}</div>}

                      {diag.status === 'active' && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12 }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateDiagnosisStatus(diag.id, 'resolved')}
                            style={{ padding: '3px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Marcar Resolvido
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRefutingDiagId(diag.id);
                              setRefutationNotes('');
                            }}
                            style={{ padding: '3px 8px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Refutar Diagnóstico
                          </button>
                        </div>
                      )}

                      {refutingDiagId === diag.id && (
                        <div style={{ marginTop: 8, padding: 10, backgroundColor: '#fff1f2', borderRadius: 4, border: '1px solid #fda4af' }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Justificativa médica para refutar *</label>
                          <input
                            type="text"
                            value={refutationNotes}
                            onChange={(e) => setRefutationNotes(e.target.value)}
                            placeholder="Descreva o motivo clínico da refutação..."
                            style={{ width: '100%', padding: 6, margin: '4px 0 8px 0', borderRadius: 4, border: '1px solid #ccc' }}
                            required
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateDiagnosisStatus(diag.id, 'refuted')}
                              style={{ padding: '4px 10px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Confirmar Refutação
                            </button>
                            <button
                              type="button"
                              onClick={() => setRefutingDiagId(null)}
                              style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 14 }}>Nenhum diagnóstico CID-10 vinculado a este atendimento.</p>
              )}
            </div>

            <form onSubmit={handleAddDiagnosis} style={{ backgroundColor: '#eff6ff', padding: 15, borderRadius: 6, border: '1px solid #bfdbfe' }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>Adicionar Novo Diagnóstico CID-10</h5>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Pesquisar CID-10 *</label>
                <CidSearchInput
                  selectedItem={selectedCid}
                  onSelect={(item) => setSelectedCid(item)}
                  onClear={() => setSelectedCid(null)}
                />
              </div>

              <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Tipo de Diagnóstico</label>
                  <select
                    value={diagType}
                    onChange={(e) => setDiagType(e.target.value as DiagnosisType)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="principal">Diagnóstico Principal (Único ativo)</option>
                    <option value="secondary">Diagnóstico Secundário / Comórbido</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Observações / Notas</label>
                  <input
                    type="text"
                    value={diagNotes}
                    onChange={(e) => setDiagNotes(e.target.value)}
                    placeholder="Notas complementares sobre o diagnóstico..."
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '8px 16px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
              >
                Vincular Diagnóstico CID-10
              </button>
            </form>
          </div>

          {/* ---------- SEÇÃO DE PRESCRIÇÃO MÉDICA ESTRUTURADA & ALERTAS (MEDC-001..019) ---------- */}
          <div style={{ marginTop: 20, borderTop: '2px solid #16a34a', paddingTop: 15, marginBottom: 20 }}>
            <h4 style={{ color: '#15803d' }}>Prescrição Médica Estruturada & Alertas de Alergia (MEDC-001..019)</h4>

            <div style={{ marginBottom: 15 }}>
              <h5>Prescrições Registradas no Atendimento</h5>
              {prescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {prescriptions.map((presc) => (
                    <div
                      key={presc.id}
                      style={{
                        padding: 15,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        backgroundColor: presc.status === 'canceled' ? '#f1f5f9' : '#f0fdf4',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>Prescrição Médica #{presc.id.substring(0, 8)}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>
                            {new Date(presc.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                            backgroundColor: presc.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: presc.status === 'active' ? '#166534' : '#991b1b',
                          }}
                        >
                          {presc.status === 'active' ? 'Ativa' : 'Cancelada'}
                        </span>
                      </div>

                      {presc.alerts && presc.alerts.length > 0 && (
                        <div style={{ marginBottom: 10, padding: 8, backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4 }}>
                          <strong style={{ color: '#b91c1c', fontSize: 12 }}>⚠️ Alerta de Alergia Sobreposto com Justificativa:</strong>
                          {presc.alerts.map((a) => (
                            <div key={a.id} style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                              • Alérgeno: <strong>{a.allergen}</strong> | Motivo médico: <em>"{a.overrideReason}"</em>
                            </div>
                          ))}
                        </div>
                      )}

                      {presc.items && presc.items.length > 0 && (
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 10 }}>
                          <thead>
                            <tr style={{ backgroundColor: '#e2e8f0', textAlign: 'left' }}>
                              <th style={{ padding: 6 }}>Medicamento</th>
                              <th style={{ padding: 6 }}>Dose</th>
                              <th style={{ padding: 6 }}>Via</th>
                              <th style={{ padding: 6 }}>Frequência</th>
                              <th style={{ padding: 6 }}>Duração</th>
                            </tr>
                          </thead>
                          <tbody>
                            {presc.items.map((item) => (
                              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: 6, fontWeight: 'bold' }}>{item.medicationName}</td>
                                <td style={{ padding: 6 }}>{item.dose} {item.doseUnit}</td>
                                <td style={{ padding: 6 }}>{item.route}</td>
                                <td style={{ padding: 6 }}>{item.frequency}</td>
                                <td style={{ padding: 6 }}>{item.duration || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {presc.status === 'active' && (
                        <div>
                          {cancelingPrescId === presc.id ? (
                            <div style={{ marginTop: 8, padding: 10, backgroundColor: '#fff1f2', borderRadius: 4 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Motivo do cancelamento *</label>
                              <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Informe o motivo médico do cancelamento..."
                                style={{ width: '100%', padding: 6, margin: '4px 0 8px 0', borderRadius: 4, border: '1px solid #ccc' }}
                                required
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleCancelPrescription(presc.id)}
                                  style={{ padding: '4px 10px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  Confirmar Cancelamento
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCancelingPrescId(null)}
                                  style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  Voltar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelingPrescId(presc.id);
                                setCancelReason('');
                              }}
                              style={{ padding: '4px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                            >
                              Cancelar Prescrição
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 14 }}>Nenhuma prescrição registrada para este atendimento.</p>
              )}
            </div>

            {/* Formulário de nova prescrição médica */}
            <form onSubmit={handleCreatePrescription} style={{ backgroundColor: '#f0fdf4', padding: 15, borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#15803d' }}>Nova Prescrição Médica</h5>

              <div style={{ marginBottom: 15, padding: 10, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <h6 style={{ margin: '0 0 8px 0' }}>Adicionar Medicamento à Prescrição</h6>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Medicamento *</label>
                  <MedicationSearchInput
                    selectedItem={selectedMedication}
                    onSelect={(item) => {
                      setSelectedMedication(item);
                      if (item.defaultRoute) setItemRoute(item.defaultRoute);
                    }}
                    onClear={() => setSelectedMedication(null)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12 }}>Dose *</label>
                    <input
                      type="number"
                      step="any"
                      value={itemDose}
                      onChange={(e) => setItemDose(Number.parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12 }}>Unidade *</label>
                    <input
                      type="text"
                      value={itemDoseUnit}
                      onChange={(e) => setItemDoseUnit(e.target.value)}
                      placeholder="mg, ml, gotas"
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12 }}>Via *</label>
                    <select
                      value={itemRoute}
                      onChange={(e) => setItemRoute(e.target.value as RouteOfAdministration)}
                      style={{ width: '100%', padding: 6 }}
                    >
                      <option value="VO">VO (Via Oral)</option>
                      <option value="EV">EV (Endovenoso)</option>
                      <option value="IM">IM (Intramuscular)</option>
                      <option value="SC">SC (Subcutâneo)</option>
                      <option value="SL">SL (Sublingual)</option>
                      <option value="Inalatoria">Inalatória</option>
                      <option value="Topica">Tópica</option>
                      <option value="Outra">Outra</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12 }}>Frequência *</label>
                    <input
                      type="text"
                      value={itemFrequency}
                      onChange={(e) => setItemFrequency(e.target.value)}
                      placeholder="6/6h, 12/12h"
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12 }}>Duração</label>
                    <input
                      type="text"
                      value={itemDuration}
                      onChange={(e) => setItemDuration(e.target.value)}
                      placeholder="Ex: 7 dias, dose única"
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: 12 }}>Orientações</label>
                    <input
                      type="text"
                      value={itemInstructions}
                      onChange={(e) => setItemInstructions(e.target.value)}
                      placeholder="Ex: Tomar após as refeições"
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemToPrescription}
                  style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                >
                  + Adicionar Item à Lista
                </button>
              </div>

              {/* Lista temporária de itens adicionados */}
              {prescriptionItems.length > 0 && (
                <div style={{ marginBottom: 15 }}>
                  <h6>Itens a Prescrever ({prescriptionItems.length})</h6>
                  <ul style={{ paddingLeft: 20 }}>
                    {prescriptionItems.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <strong>{item.medicationName}</strong> - {item.dose} {item.doseUnit} via {item.route} ({item.frequency})
                        <button
                          type="button"
                          onClick={() => handleRemovePrescriptionItem(idx)}
                          style={{ marginLeft: 10, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                          [Remover]
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showAllergyModal && (
                <div style={{ padding: 12, backgroundColor: '#fff1f2', border: '2px solid #e11d48', borderRadius: 6, marginBottom: 15 }}>
                  <h5 style={{ color: '#9f1239', margin: '0 0 6px 0' }}>🚨 Alerta Crítico de Alergia do Paciente</h5>
                  <p style={{ color: '#881337', fontSize: 13, margin: '0 0 10px 0' }}>{allergyModalMessage}</p>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Justificativa Médica de Sobreposição (Mínimo 10 caracteres) *</label>
                  <textarea
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    rows={2}
                    placeholder="Descreva detalhadamente a justificativa técnica médica para prescrever o medicamento..."
                    style={{ width: '100%', padding: 8, margin: '4px 0 10px 0', borderRadius: 4, border: '1px solid #fda4af' }}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || prescriptionItems.length === 0}
                style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
              >
                Emitir Prescrição Médica
              </button>
            </form>
          </div>

          {/* ---------- SEÇÃO DE EXAMES, PROCEDIMENTOS & INTERCONSULTAS (EXM-001..009) ---------- */}
          <div style={{ marginTop: 20, borderTop: '2px solid #7c3aed', paddingTop: 15, marginBottom: 20 }}>
            <h4 style={{ color: '#6d28d9' }}>Exames, Procedimentos Ambulatoriais e Interconsultas (EXM-001..009)</h4>

            {/* 1. Solicitações de Exames */}
            <div style={{ marginBottom: 20 }}>
              <h5>Exames Laboratoriais e de Imagem</h5>
              {examRequests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
                  {examRequests.map((exam) => (
                    <div key={exam.id} style={{ padding: 12, borderRadius: 6, border: '1px solid #e9d5ff', backgroundColor: '#faf5ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: 14, color: '#581c87' }}>{exam.examName}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({exam.examType})</span>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 'bold',
                            backgroundColor: exam.status === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: exam.status === 'completed' ? '#166534' : '#92400e',
                          }}
                        >
                          {exam.status === 'completed' ? 'Concluído / Resultado' : 'Solicitado'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                        <strong>Indicação Clínica:</strong> {exam.clinicalIndication}
                      </div>
                      {exam.resultSummary && (
                        <div style={{ marginTop: 6, padding: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 13 }}>
                          <strong>Resultado / Laudo:</strong> {exam.resultSummary}
                        </div>
                      )}

                      {exam.status !== 'completed' && (
                        <div style={{ marginTop: 8 }}>
                          {recordingResultExamId === exam.id ? (
                            <div style={{ padding: 8, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Lançar Resultado / Laudo Técnico *</label>
                              <input
                                type="text"
                                value={examResultSummary}
                                onChange={(e) => setExamResultSummary(e.target.value)}
                                placeholder="Descreva o laudo/resultado do exame..."
                                style={{ width: '100%', padding: 6, margin: '4px 0 6px 0' }}
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" onClick={() => handleRecordExamResult(exam.id)} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                                  Salvar Resultado
                                </button>
                                <button type="button" onClick={() => setRecordingResultExamId(null)} style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setRecordingResultExamId(exam.id); setExamResultSummary(''); }} style={{ padding: '3px 8px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                              Lançar Resultado
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 13 }}>Nenhum exame solicitado.</p>
              )}

              <form onSubmit={handleCreateExamRequest} style={{ backgroundColor: '#faf5ff', padding: 12, borderRadius: 6, border: '1px solid #e9d5ff' }}>
                <h6 style={{ margin: '0 0 8px 0', color: '#6d28d9' }}>Solicitar Novo Exame</h6>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Pesquisar Exame *</label>
                  <ExamSearchInput
                    selectedItem={selectedExamItem}
                    onSelect={(item) => setSelectedExamItem(item)}
                    onClear={() => setSelectedExamItem(null)}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Indicação Clínica * (Mínimo 5 caracteres)</label>
                  <input
                    type="text"
                    value={examClinicalIndication}
                    onChange={(e) => setExamClinicalIndication(e.target.value)}
                    placeholder="Ex: Suspeita de pneumonia / síndrome febril..."
                    style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                    required
                  />
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                  Solicitar Exame
                </button>
              </form>
            </div>

            {/* 2. Procedimentos Ambulatoriais */}
            <div style={{ marginBottom: 20 }}>
              <h5>Procedimentos Ambulatoriais</h5>
              {procedureRequests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
                  {procedureRequests.map((proc) => (
                    <div key={proc.id} style={{ padding: 10, borderRadius: 6, border: '1px solid #fed7aa', backgroundColor: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{proc.procedureName}</strong>
                        {proc.instructions && <div style={{ fontSize: 12, color: '#64748b' }}>Instr: {proc.instructions}</div>}
                      </div>
                      <div>
                        {proc.status === 'completed' ? (
                          <span style={{ padding: '2px 6px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>Executado</span>
                        ) : (
                          <button type="button" onClick={() => handleExecuteProcedure(proc.id)} style={{ padding: '3px 8px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                            Marcar Executado
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 13 }}>Nenhum procedimento solicitado.</p>
              )}

              <form onSubmit={handleCreateProcedureRequest} style={{ backgroundColor: '#fff7ed', padding: 12, borderRadius: 6, border: '1px solid #fed7aa' }}>
                <h6 style={{ margin: '0 0 8px 0', color: '#c2410c' }}>Solicitar Procedimento Ambulatorial</h6>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={procedureNameInput}
                    onChange={(e) => setProcedureNameInput(e.target.value)}
                    placeholder="Nome do procedimento (ex: Sutura, Nebulização)..."
                    style={{ flex: 1, padding: 6 }}
                    required
                  />
                  <input
                    type="text"
                    value={procedureInstructionsInput}
                    onChange={(e) => setProcedureInstructionsInput(e.target.value)}
                    placeholder="Instruções / Observações..."
                    style={{ flex: 1, padding: 6 }}
                  />
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                  Solicitar Procedimento
                </button>
              </form>
            </div>

            {/* 3. Interconsultas Médicas */}
            <div>
              <h5>Interconsultas Médicas Especializadas</h5>
              {interconsultations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
                  {interconsultations.map((inter) => (
                    <div key={inter.id} style={{ padding: 12, borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Parecer Especialidade: {inter.specialty}</strong>
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', backgroundColor: inter.status === 'answered' ? '#dcfce7' : '#e0f2fe', color: inter.status === 'answered' ? '#166534' : '#0369a1' }}>
                          {inter.status === 'answered' ? 'Respondida' : 'Aguardando Parecer'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                        <strong>Resumo:</strong> {inter.clinicalSummary} | <strong>Quesito:</strong> {inter.question}
                      </div>
                      {inter.responseNotes && (
                        <div style={{ marginTop: 6, padding: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 13 }}>
                          <strong>Parecer Técnico:</strong> {inter.responseNotes}
                        </div>
                      )}

                      {inter.status !== 'answered' && (
                        <div style={{ marginTop: 8 }}>
                          {respondingInterId === inter.id ? (
                            <div style={{ padding: 8, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Emitir Parecer Técnico do Especialista * (Min 10 caracteres)</label>
                              <textarea
                                value={interResponseNotes}
                                onChange={(e) => setInterResponseNotes(e.target.value)}
                                rows={2}
                                placeholder="Descreva a avaliação e conduta do especialista..."
                                style={{ width: '100%', padding: 6, margin: '4px 0 6px 0' }}
                                required
                              />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" onClick={() => handleRespondInterconsultation(inter.id)} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                                  Salvar Parecer
                                </button>
                                <button type="button" onClick={() => setRespondingInterId(null)} style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setRespondingInterId(inter.id); setInterResponseNotes(''); }} style={{ padding: '3px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                              Responder Interconsulta
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma interconsulta solicitada.</p>
              )}

              <form onSubmit={handleCreateInterconsultation} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <h6 style={{ margin: '0 0 8px 0' }}>Solicitar Nova Interconsulta</h6>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12 }}>Especialidade *</label>
                    <input
                      type="text"
                      value={interSpecialty}
                      onChange={(e) => setInterSpecialty(e.target.value)}
                      placeholder="Ex: Cardiologia, Ortopedia"
                      style={{ width: '100%', padding: 6 }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12 }}>Prioridade *</label>
                    <select
                      value={interPriority}
                      onChange={(e) => setInterPriority(e.target.value as InterconsultationPriority)}
                      style={{ width: '100%', padding: 6 }}
                    >
                      <option value="routine">Rotina</option>
                      <option value="urgent">Urgente</option>
                      <option value="emergency">Emergência</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 12 }}>Resumo Clínico *</label>
                  <input
                    type="text"
                    value={interClinicalSummary}
                    onChange={(e) => setInterClinicalSummary(e.target.value)}
                    placeholder="Breve histórico do caso..."
                    style={{ width: '100%', padding: 6 }}
                    required
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12 }}>Dúvida / Quesito para o Especialista *</label>
                  <input
                    type="text"
                    value={interQuestion}
                    onChange={(e) => setInterQuestion(e.target.value)}
                    placeholder="Quesito técnico para o parecer..."
                    style={{ width: '100%', padding: 6 }}
                    required
                  />
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                  Enviar Interconsulta
                </button>
              </form>
            </div>
          </div>

          {/* ---------- SEÇÃO DE DESFECHO ASSISTENCIAL & SUMÁRIO DE ALTA (OUT-001..014) ---------- */}
          <div style={{ marginTop: 20, borderTop: '3px solid #0f172a', paddingTop: 15, marginBottom: 20 }}>
            <h4 style={{ color: '#0f172a' }}>Encerramento do Atendimento & Sumário de Alta (OUT-001..014)</h4>

            {outcome ? (
              <div style={{ padding: 15, backgroundColor: '#f8fafc', border: '2px solid #0f172a', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 16, color: '#0f172a' }}>Atendimento Encerrado — Desfecho Assistencial</strong>
                  <span style={{ padding: '4px 12px', borderRadius: 4, fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', fontSize: 13 }}>
                    {outcome.outcomeType.toUpperCase()}
                  </span>
                </div>
                {outcome.notes && <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}><strong>Observações:</strong> {outcome.notes}</div>}
                {outcome.destinationUnit && <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}><strong>Unidade de Destino:</strong> {outcome.destinationUnit}</div>}

                {summary && <MedicalSummaryView summary={summary} patientName="Paciente UPA" />}
              </div>
            ) : (
              <form onSubmit={handleCreateOutcome} style={{ backgroundColor: '#f1f5f9', padding: 15, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Registrar Desfecho Assistencial</h5>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Tipo de Desfecho Assistencial *</label>
                  <select
                    value={selectedOutcomeType}
                    onChange={(e) => setSelectedOutcomeType(e.target.value as OutcomeType)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="medical_discharge">Alta Médica com Orientações (Exige CID-10 Principal)</option>
                    <option value="discharge_against_medical_advice">Alta a Pedido (Exige Justificativa em Notas)</option>
                    <option value="administrative_discharge">Alta Administrativa</option>
                    <option value="transfer">Transferência Externa Regulada (Exige Unidade de Destino)</option>
                    <option value="admission_bed">Internação / Permanência em Leito UPA</option>
                    <option value="evasion">Evasão / Saída Não Autorizada</option>
                    <option value="death">Óbito (Exige Timestamp e Causa em Notas)</option>
                  </select>
                </div>

                {selectedOutcomeType === 'transfer' && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Unidade Hospitalar de Destino *</label>
                    <input
                      type="text"
                      value={destinationUnit}
                      onChange={(e) => setDestinationUnit(e.target.value)}
                      placeholder="Ex: Hospital Regional de Referência / Santa Casa"
                      style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                      required
                    />
                  </div>
                )}

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Orientações Médicas de Alta / Prescrição Domiciliar</label>
                  <textarea
                    value={dischargeInstructions}
                    onChange={(e) => setDischargeInstructions(e.target.value)}
                    rows={2}
                    placeholder="Orientações de cuidados, sinais de alarme, receitas..."
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Observações / Motivo / Justificativa *</label>
                  <textarea
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    rows={2}
                    placeholder="Observações do desfecho assistencial..."
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}
                >
                  Concluir Atendimento e Emitir Sumário de Alta
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: 20, borderTop: '2px solid #e2e8f0', paddingTop: 15 }}>
            <h4>Evoluções / Reavaliações Médicas Sequenciais</h4>
            {existingConsultation.evolutions && existingConsultation.evolutions.length > 0 ? (
              <div style={{ marginBottom: 15 }}>
                {existingConsultation.evolutions.map((evo) => (
                  <div key={evo.id} style={{ padding: 10, borderLeft: '4px solid #2563eb', backgroundColor: '#f8fafc', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {new Date(evo.createdAt).toLocaleString()} | Status: {evo.clinicalStatus || 'Estável'}
                    </div>
                    <div style={{ marginTop: 5 }}>{evo.evolutionText}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 14 }}>Nenhuma evolução adicional registrada.</p>
            )}

            <form onSubmit={handleAddEvolution} style={{ display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: '#f8fafc', padding: 15, borderRadius: 6 }}>
              <h5>Adicionar Nova Evolução Médica</h5>
              <textarea
                value={evolutionText}
                onChange={(e) => setEvolutionText(e.target.value)}
                placeholder="Descreva a reavaliação ou evolução clínica do paciente..."
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 'bold' }}>Status Clínico:</label>
                <input
                  type="text"
                  value={clinicalStatus}
                  onChange={(e) => setClinicalStatus(e.target.value)}
                  placeholder="Ex.: estável, em melhora"
                  style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Adicionar Evolução
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitConsultation}>
          <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
            <legend><strong>1. Anamnese Médica</strong></legend>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="chiefComplaint" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Queixa Principal *</label>
              <input
                id="chiefComplaint"
                type="text"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Queixa relatada pelo paciente"
                style={{ width: '100%', padding: 8 }}
                required
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="historyPresentIllness" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>História da Moléstia Atual (HMA) *</label>
              <textarea
                id="historyPresentIllness"
                value={historyPresentIllness}
                onChange={(e) => setHistoryPresentIllness(e.target.value)}
                rows={4}
                placeholder="Detalhamento cronológico da evolução dos sintomas..."
                style={{ width: '100%', padding: 8 }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Antecedentes Pessoais / Comorbidades</label>
                <textarea
                  value={pastMedicalHistory}
                  onChange={(e) => setPastMedicalHistory(e.target.value)}
                  rows={2}
                  placeholder="HAS, DM, Cirurgias anteriores..."
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Revisão de Sistemas</label>
                <textarea
                  value={systemReview}
                  onChange={(e) => setSystemReview(e.target.value)}
                  rows={2}
                  placeholder="Sintomas gerais por aparelhos..."
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
            <legend><strong>2. Exame Físico</strong></legend>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="generalExam" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Exame Físico Geral *</label>
              <textarea
                id="generalExam"
                value={generalExam}
                onChange={(e) => setGeneralExam(e.target.value)}
                rows={2}
                placeholder="BEG, acianótico, anictérico, corado, hidratado..."
                style={{ width: '100%', padding: 8 }}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13 }}>Aparelho Cardiovascular</label>
                <input
                  type="text"
                  value={cvExam}
                  onChange={(e) => setCvExam(e.target.value)}
                  placeholder="RCR 2T BNF sem sopros"
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13 }}>Aparelho Respiratório</label>
                <input
                  type="text"
                  value={respExam}
                  onChange={(e) => setRespExam(e.target.value)}
                  placeholder="MV+ sem ruídos adventícios"
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13 }}>Abdômen</label>
                <input
                  type="text"
                  value={abdExam}
                  onChange={(e) => setAbdExam(e.target.value)}
                  placeholder="Atípico, RHA+, flácido, indolor"
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13 }}>Neurológico</label>
                <input
                  type="text"
                  value={neuroExam}
                  onChange={(e) => setNeuroExam(e.target.value)}
                  placeholder="Consciente, orientado, sem déficits"
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13 }}>Membros / Extremidades</label>
                <input
                  type="text"
                  value={extExam}
                  onChange={(e) => setExtExam(e.target.value)}
                  placeholder="Sem edemas, pulsos presentes e simétricos"
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
            </div>
          </fieldset>

          <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
            <legend><strong>3. Hipótese Diagnóstica & Conduta</strong></legend>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="diagnosticHypothesis" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Hipótese Diagnóstica Clínica *</label>
              <input
                id="diagnosticHypothesis"
                type="text"
                value={diagnosticHypothesis}
                onChange={(e) => setDiagnosticHypothesis(e.target.value)}
                placeholder="Hipótese clínica formulada pelo médico"
                style={{ width: '100%', padding: 8 }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4 }}>Plano de Conduta Inicial</label>
              <textarea
                value={initialConduct}
                onChange={(e) => setInitialConduct(e.target.value)}
                rows={2}
                placeholder="Orientação, medicação sintomática, exames..."
                style={{ width: '100%', padding: 8 }}
              />
            </div>
          </fieldset>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
            >
              Registrar Consulta Médica
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
