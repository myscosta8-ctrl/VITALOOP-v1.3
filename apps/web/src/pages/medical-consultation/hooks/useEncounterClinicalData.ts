import { useCallback, useEffect, useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import { createMedicalApi, type MedicalConsultation } from '../../../lib/medical-api.js';
import { createTriagesApi, type Triage } from '../../../lib/triages-api.js';
import { createDiagnosesApi, type EncounterDiagnosis } from '../../../lib/diagnoses-api.js';
import { createPrescriptionsApi, type Prescription } from '../../../lib/prescriptions-api.js';
import {
  createExamsApi,
  type ExamRequest,
  type ProcedureRequest,
  type Interconsultation,
} from '../../../lib/exams-api.js';
import { createOutcomesApi, type EncounterOutcome, type EncounterSummary } from '../../../lib/outcomes-api.js';
import { createBedApi, type BedData } from '../../../lib/bed-api.js';
import { createAdmissionApi, type Admission } from '../../../lib/admission-api.js';

/**
 * Carrega e mantém tudo que a Ficha Clínica precisa ler para as 7 abas
 * (Triagem, Consulta, Diagnósticos, Prescrições, Exames, Internação,
 * Desfecho) — extraído de MedicalConsultationPage.tsx (10/09/2026) para
 * separar "buscar dados" de "renderizar aba". Cada hook de aba (useDiagnoses,
 * usePrescriptions...) chama `reload()` depois de uma mutação, em vez de
 * duplicar lógica de fetch.
 */
export const useEncounterClinicalData = (api: ApiClient, encounterId: string) => {
  const medicalApi = createMedicalApi(api);
  const triagesApi = createTriagesApi(api);
  const diagnosesApi = createDiagnosesApi(api);
  const prescriptionsApi = createPrescriptionsApi(api);
  const examsApi = createExamsApi(api);
  const outcomesApi = createOutcomesApi(api);
  const bedApi = createBedApi(api);
  const admissionApi = createAdmissionApi(api);

  const [triage, setTriage] = useState<Triage | null>(null);
  const [bedInfo, setBedInfo] = useState<BedData | null>(null);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [existingConsultation, setExistingConsultation] = useState<MedicalConsultation | null>(null);
  const [diagnoses, setDiagnoses] = useState<readonly EncounterDiagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<readonly Prescription[]>([]);
  const [examRequests, setExamRequests] = useState<readonly ExamRequest[]>([]);
  const [procedureRequests, setProcedureRequests] = useState<readonly ProcedureRequest[]>([]);
  const [interconsultations, setInterconsultations] = useState<readonly Interconsultation[]>([]);
  const [outcome, setOutcome] = useState<EncounterOutcome | null>(null);
  const [summary, setSummary] = useState<EncounterSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      try {
        setTriage(await triagesApi.getTriage(encounterId));
      } catch {
        /* sem triagem */
      }

      try {
        setExistingConsultation(await medicalApi.getConsultation(encounterId));
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

      // Não existe endpoint dedicado "leito deste atendimento" — o mapa de
      // leitos é a única fonte, então buscamos nele o leito cujo
      // encounterId bate com este atendimento (aba "Internação").
      try {
        const map = await bedApi.getBedsMap();
        const allBeds = map.flatMap((sectorMap) => sectorMap.beds);
        setBedInfo(allBeds.find((b) => b.encounterId === encounterId) ?? null);
      } catch {
        setBedInfo(null);
      }

      try {
        setAdmission(await admissionApi.getAdmission(encounterId));
      } catch {
        setAdmission(null);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao carregar prontuário médico.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [api, encounterId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    triage,
    bedInfo,
    admission,
    setAdmission,
    existingConsultation,
    diagnoses,
    prescriptions,
    examRequests,
    procedureRequests,
    interconsultations,
    outcome,
    summary,
    loading,
    errorMessage,
    setErrorMessage,
    setExistingConsultation,
    setOutcome,
    setSummary,
    reload,
  };
};

export type EncounterClinicalData = ReturnType<typeof useEncounterClinicalData>;
