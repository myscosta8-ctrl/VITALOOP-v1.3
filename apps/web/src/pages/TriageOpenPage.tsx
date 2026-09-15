import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createTriagesApi,
  type ManchesterRiskColor,
  type Triage,
  type TriageAirway,
  type TriageClassificationEvent,
  type TriageBreathing,
  type TriageCirculation,
  type TriageConsciousness,
  type TriageDestinationEvent,
  type TriageDestinationType,
  type TriageEvolution,
  type TriageExamCategory,
  type TriageGeneralCondition,
  type TriagePregnancyStatus,
  type TriageProcedureKind,
  type TriageSkinFinding,
} from '../lib/triages-api.js';
import { createEncountersApi, type Encounter } from '../lib/encounters-api.js';
import { createPatientsApi, type Patient, type PatientAllergy, type PatientAntecedent } from '../lib/patients-api.js';
import { createVitalSignsApi } from '../lib/vital-signs-api.js';
import { createConsultationRoomsApi } from '../lib/consultation-rooms-api.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Textarea } from '../components/ui/textarea.js';
import { Badge } from '../components/ui/badge.js';
import { Overlay } from '../components/ui/overlay.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { EncounterFlowNav } from '../components/EncounterFlowNav.js';
import { encounterRoute } from '../lib/routes.js';
import { formatTimeOfDay, formatDuration } from '../lib/datetime-format.js';
import { ENCOUNTER_STATUS_LABEL } from '../lib/encounter-flow.js';
import { computeReturnAlert, RETURN_ALERT_CONFIG, type ReturnAlertResult } from '../lib/return-alerts.js';
import { toast } from '../lib/toast.js';

interface TriageOpenPageProps {
  encounterId: string;
  onSuccess?: () => void;
  /** Sobrepõe o "Voltar" padrão do EncounterFlowNav — ver TriagePage.tsx. */
  onBack?: () => void;
}

// Estrutura oficial do Protocolo de Manchester usada nesta tela — número,
// cor, descrição e tempo-alvo exibidos juntos (regra 7/8 desta etapa: nunca
// substituir o número por texto simples). Cores vêm dos tokens `--triage-*`
// já existentes (mesma fonte que `MANCHESTER_BADGE_STYLE` em
// QueueDashboardPage.tsx) — não inventa nem duplica paleta.
export const MANCHESTER_LEVELS: ReadonlyArray<{
  color: ManchesterRiskColor;
  number: number;
  label: string;
  description: string;
  targetMinutes: number;
  bg: string;
  text: string;
}> = [
  { color: 'red', number: 1, label: 'Vermelho — Emergência', description: 'Atendimento imediato', targetMinutes: 0, bg: 'var(--triage-red-bg)', text: 'var(--triage-red-text)' },
  { color: 'orange', number: 2, label: 'Laranja — Muito urgente', description: 'Atendimento em até 10 minutos', targetMinutes: 10, bg: 'var(--triage-orange-bg)', text: 'var(--triage-orange-text)' },
  { color: 'yellow', number: 3, label: 'Amarelo — Urgente', description: 'Atendimento em até 60 minutos', targetMinutes: 60, bg: 'var(--triage-yellow-bg)', text: 'var(--triage-yellow-text)' },
  { color: 'green', number: 4, label: 'Verde — Pouco urgente', description: 'Atendimento em até 120 minutos', targetMinutes: 120, bg: 'var(--triage-green-bg)', text: 'var(--triage-green-text)' },
  { color: 'blue', number: 5, label: 'Azul — Não urgente', description: 'Atendimento em até 240 minutos', targetMinutes: 240, bg: 'var(--triage-blue-bg)', text: 'var(--triage-blue-text)' },
];

// Lista fixa de antecedentes de seleção rápida (referência visual oficial).
// O domínio não possui uma taxonomia fechada de antecedentes — apenas texto
// livre (`PatientAntecedent.description`/`category`) — então cada opção aqui
// grava exatamente essa estrutura já existente (`patientsApi.createAntecedent`),
// sem criar uma segunda tabela/master de condições clínicas.
const QUICK_ANTECEDENTS = ['Hipertensão', 'Diabetes', 'Cardiopatia', 'Asma', 'DPOC', 'Câncer', 'AVC', 'Alergias', 'Outros'] as const;

// Opções de encaminhamento pós-triagem — ver nota no JSX: seleção
// informativa (não persistida), o domínio ainda não modela essa ramificação.
// Bloco 1 (14/09/2026) — avaliação inicial estruturada. Rótulos em
// português mapeados para os valores fechados já validados pelo domínio
// (packages/domain/src/triage/types.ts) — nenhum valor novo é inventado
// aqui, só a apresentação.
const GENERAL_CONDITION_LABEL: Record<TriageGeneralCondition, string> = { good: 'Bom', regular: 'Regular', severe: 'Grave' };
const CONSCIOUSNESS_LABEL: Record<TriageConsciousness, string> = {
  oriented: 'Orientado', confused: 'Confuso', drowsy: 'Sonolento', obtunded: 'Torporoso', unconscious: 'Inconsciente',
};
const AIRWAY_LABEL: Record<TriageAirway, string> = { patent: 'Pérvia', altered: 'Alterada', obstructed: 'Obstruída' };
const BREATHING_LABEL: Record<TriageBreathing, string> = { normal: 'Normal', altered: 'Alterada', respiratory_distress: 'Desconforto respiratório' };
const CIRCULATION_LABEL: Record<TriageCirculation, string> = { preserved: 'Preservada', altered: 'Alterada' };
const SKIN_FINDING_LABEL: Record<TriageSkinFinding, string> = {
  normal_color: 'Corada', pale: 'Pálida', cyanotic: 'Cianótica', diaphoretic: 'Sudoreica', jaundiced: 'Ictérica', other: 'Outra',
};
const EVOLUTION_LABEL: Record<TriageEvolution, string> = {
  sudden: 'Súbita', gradual: 'Gradual', progressive: 'Progressiva', recurrent: 'Recorrente', stable: 'Estável', worsening: 'Piorando', improving: 'Melhorando',
};
const PREGNANCY_STATUS_LABEL: Record<TriagePregnancyStatus, string> = { yes: 'Sim', no: 'Não', unknown: 'Não informado' };

/** `<input type="datetime-local">` não inclui timezone — converte pro ISO completo que a API exige (z.string().datetime()). */
const localDateTimeToIso = (value: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
// Encaminhamento após triagem (Bloco 3) — regra operacional da UPA: só
// estes 4 tipos existem. "Leito comum"/"internação" propositalmente NÃO são
// uma opção (decisão médica posterior, fora do escopo da Triagem).
const DESTINATION_TYPE_LABEL: Record<TriageDestinationType, string> = {
  medical_consultation: 'Atendimento médico',
  red_room: 'Sala Vermelha',
  exam: 'Exame',
  procedure: 'Procedimento',
};
const EXAM_CATEGORY_LABEL: Record<TriageExamCategory, string> = { laboratory: 'Laboratorial', imaging: 'Imagem' };
const PROCEDURE_KIND_LABEL: Record<TriageProcedureKind, string> = {
  dressing_change: 'Troca de curativo',
  urinary_catheter_change: 'Troca de SVD',
  other: 'Outro procedimento institucional',
};
// Bloco 4, item 16 — "próximo fluxo" exibido junto ao destino escolhido.
// Espelha `resolveDestinationFlowStage` do domínio (apps/web não depende de
// @vitaloop/domain, por convenção já usada nos demais labels desta tela).
// Não representa nenhum estado novo da máquina de estados do atendimento —
// é só texto informativo para o profissional.
const DESTINATION_NEXT_FLOW_LABEL: Record<TriageDestinationType, string> = {
  medical_consultation: 'Paciente entra na fila de atendimento médico do consultório selecionado.',
  red_room: 'Paciente é encaminhado diretamente à Sala Vermelha.',
  exam: 'Paciente segue para o fluxo de exames, sem passar pelo consultório médico.',
  procedure: 'Paciente segue para o fluxo de procedimentos, sem passar pelo consultório médico.',
};

const age = (birthDate: string | null | undefined): number | null => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
};

const SEX_LABEL: Record<string, string> = { male: 'Masculino', female: 'Feminino', undetermined: 'Indeterminado' };

// Destaque semântico de sinal vital fora da faixa adulta usual — recurso
// visual (cor do texto), não um score clínico (NEWS/MEWS) e não substitui o
// julgamento do profissional na escolha da classificação Manchester.
const isBpAbnormal = (sys: number | null, dia: number | null): boolean =>
  (sys != null && (sys < 90 || sys >= 140)) || (dia != null && (dia < 60 || dia >= 90));
const isHrAbnormal = (v: number | null): boolean => v != null && (v < 60 || v > 100);
const isRrAbnormal = (v: number | null): boolean => v != null && (v < 12 || v > 20);
const isTempAbnormal = (v: number | null): boolean => v != null && (v < 35.5 || v >= 37.8);
const isSpo2Abnormal = (v: number | null): boolean => v != null && v < 95;

/**
 * Triagem — avaliação inicial e classificação de risco (implementação de
 * 14/09/2026 a partir da imagem de referência oficial `TRIAGEM.png`).
 *
 * Usada de duas formas: (1) embutida em `TriagePage.tsx`, ao clicar "Triar"
 * na fila (composição igual à Recepção — fila + área de trabalho na mesma
 * tela); (2) standalone na rota `#/atendimentos/:id/triagem` (mantida por
 * compatibilidade com `EncounterFlowNav`/links existentes).
 *
 * A Triagem NUNCA cria atendimento — trabalha sobre o `encounterId` já
 * aberto pela Recepção. Se uma triagem já existe para este atendimento
 * (`GET .../triage` bem-sucedido), a tela entra em modo somente-leitura da
 * avaliação inicial + painel de Reclassificação (API já existente,
 * `PATCH .../triage/reclassify`, com motivo obrigatório e rastreabilidade
 * via `reclassifiedFrom` — nada inventado). Caso contrário, mostra o
 * formulário de registro inicial.
 */
export const TriageOpenPage: React.FC<TriageOpenPageProps> = ({ encounterId, onSuccess, onBack }) => {
  const { api } = useSession();
  const triagesApi = createTriagesApi(api);
  const encountersApi = createEncountersApi(api);
  const patientsApi = createPatientsApi(api);
  const vitalSignsApi = createVitalSignsApi(api);
  const consultationRoomsApi = createConsultationRoomsApi(api);
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ['consultation-rooms'],
    queryFn: () => consultationRoomsApi.listRooms(),
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const encounterQuery = useQuery({
    queryKey: ['triage-encounter', encounterId],
    queryFn: () => encountersApi.getEncounter(encounterId),
  });
  const patientId = encounterQuery.data?.patientId;

  const patientQuery = useQuery({
    queryKey: ['triage-patient', patientId],
    queryFn: () => patientsApi.get(patientId!),
    enabled: !!patientId,
  });

  const existingTriageQuery = useQuery({
    queryKey: ['triage', encounterId],
    queryFn: () => triagesApi.getTriage(encounterId),
    retry: false,
  });
  const existingTriage: Triage | null =
    existingTriageQuery.isSuccess ? existingTriageQuery.data : null;

  const allergiesQuery = useQuery({
    queryKey: ['triage-allergies', patientId],
    queryFn: () => patientsApi.listAllergies(patientId!),
    enabled: !!patientId,
  });
  const medicationsQuery = useQuery({
    queryKey: ['triage-medications', patientId],
    queryFn: () => patientsApi.listContinuousMedications(patientId!),
    enabled: !!patientId,
  });
  const timelineQuery = useQuery({
    queryKey: ['triage-timeline', patientId],
    queryFn: () => patientsApi.getTimeline(patientId!),
    enabled: !!patientId,
  });
  const antecedentsQuery = useQuery({
    queryKey: ['triage-antecedents', patientId],
    queryFn: () => patientsApi.listAntecedents(patientId!),
    enabled: !!patientId,
  });

  // Alerta de retornos recentes (item 6-13 desta etapa) — usa os
  // atendimentos REAIS do paciente já existentes (`app.encounters`), nenhuma
  // tabela/endpoint novo. Cálculo puro em lib/return-alerts.ts.
  const patientEncountersQuery = useQuery({
    queryKey: ['triage-patient-encounters', patientId],
    queryFn: () => encountersApi.listEncounters({ patientId: patientId! }),
    enabled: !!patientId,
  });

  // --- Formulário de registro inicial (só usado quando ainda não há triagem) ---
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [history, setHistory] = useState('');
  const [otherAntecedent, setOtherAntecedent] = useState('');
  const [showOtherAntecedent, setShowOtherAntecedent] = useState(false);

  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [painScore, setPainScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [riskColor, setRiskColor] = useState<ManchesterRiskColor | null>(null);

  // --- Avaliação inicial estruturada (Bloco 1) ---
  const [generalCondition, setGeneralCondition] = useState<TriageGeneralCondition | ''>('');
  const [consciousness, setConsciousness] = useState<TriageConsciousness | ''>('');
  const [airway, setAirway] = useState<TriageAirway | ''>('');
  const [breathing, setBreathing] = useState<TriageBreathing | ''>('');
  const [circulation, setCirculation] = useState<TriageCirculation | ''>('');
  const [skinFindings, setSkinFindings] = useState<TriageSkinFinding[]>([]);
  const [skinFindingsOther, setSkinFindingsOther] = useState('');

  // --- Gestação (Bloco 1) ---
  const [pregnancyStatus, setPregnancyStatus] = useState<TriagePregnancyStatus | ''>('');
  const [pregnancyWeeks, setPregnancyWeeks] = useState('');
  const [obstetricNotes, setObstetricNotes] = useState('');

  // --- Início/evolução da queixa (Bloco 1) ---
  const [complaintOnsetAt, setComplaintOnsetAt] = useState('');
  const [complaintEvolution, setComplaintEvolution] = useState<TriageEvolution | ''>('');
  const [complaintNotes, setComplaintNotes] = useState('');

  // --- Avaliação detalhada da dor (Bloco 1 — complementa `painScore`, já existente) ---
  const [painLocation, setPainLocation] = useState('');
  const [painIrradiation, setPainIrradiation] = useState('');
  const [painCharacter, setPainCharacter] = useState('');
  const [painOnsetAt, setPainOnsetAt] = useState('');
  const [painEvolution, setPainEvolution] = useState<TriageEvolution | ''>('');

  // --- Encaminhamento após triagem (Bloco 3) — obrigatório ao finalizar ---
  const [destinationType, setDestinationType] = useState<TriageDestinationType | ''>('');
  const [destinationRoomId, setDestinationRoomId] = useState('');
  const [destinationExamCategory, setDestinationExamCategory] = useState<TriageExamCategory | ''>('');
  const [destinationProcedureKind, setDestinationProcedureKind] = useState<TriageProcedureKind | ''>('');
  const [destinationProcedureOther, setDestinationProcedureOther] = useState('');
  const [destinationNotes, setDestinationNotes] = useState('');

  // --- Alterar encaminhamento (só disponível após a triagem já ter um destino) ---
  const [changeDestType, setChangeDestType] = useState<TriageDestinationType | ''>('');
  const [changeDestRoomId, setChangeDestRoomId] = useState('');
  const [changeDestExamCategory, setChangeDestExamCategory] = useState<TriageExamCategory | ''>('');
  const [changeDestProcedureKind, setChangeDestProcedureKind] = useState<TriageProcedureKind | ''>('');
  const [changeDestProcedureOther, setChangeDestProcedureOther] = useState('');
  const [changeDestNotes, setChangeDestNotes] = useState('');
  const [changeDestReason, setChangeDestReason] = useState('');
  const [isChangingDestination, setIsChangingDestination] = useState(false);
  const [changeDestError, setChangeDestError] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [showReturnDetails, setShowReturnDetails] = useState(false);

  // --- Registro de alergia/medicamento a partir da Triagem (dados
  // longitudinais do paciente, deduplicados — ver itens 23/24) ---
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');

  const clearDraft = () => {
    if (
      (chiefComplaint || history || notes || systolicBp || heartRate) &&
      !window.confirm('Isso vai limpar os dados ainda não finalizados desta triagem. Continuar?')
    ) {
      return;
    }
    setChiefComplaint('');
    setHistory('');
    setSystolicBp('');
    setDiastolicBp('');
    setHeartRate('');
    setRespiratoryRate('');
    setTemperature('');
    setOxygenSaturation('');
    setPainScore(0);
    setNotes('');
    setRiskColor(null);
    setGeneralCondition('');
    setConsciousness('');
    setAirway('');
    setBreathing('');
    setCirculation('');
    setSkinFindings([]);
    setSkinFindingsOther('');
    setPregnancyStatus('');
    setPregnancyWeeks('');
    setObstetricNotes('');
    setComplaintOnsetAt('');
    setComplaintEvolution('');
    setComplaintNotes('');
    setPainLocation('');
    setPainIrradiation('');
    setPainCharacter('');
    setPainOnsetAt('');
    setPainEvolution('');
    setDestinationType('');
    setDestinationRoomId('');
    setDestinationExamCategory('');
    setDestinationProcedureKind('');
    setDestinationProcedureOther('');
    setDestinationNotes('');
    setErrorMsg(null);
  };

  const toggleSkinFinding = (finding: TriageSkinFinding) => {
    setSkinFindings((cur) => (cur.includes(finding) ? cur.filter((f) => f !== finding) : [...cur, finding]));
  };

  const toggleAntecedent = async (label: string) => {
    if (!patientId) return;
    if (label === 'Outros') {
      setShowOtherAntecedent((v) => !v);
      return;
    }
    const already = (antecedentsQuery.data ?? []).some(
      (a: PatientAntecedent) => a.description.toLowerCase() === label.toLowerCase(),
    );
    if (already) return; // sem endpoint de remoção — não inventar exclusão
    await patientsApi.createAntecedent(patientId, { description: label, category: 'Triagem' });
    queryClient.invalidateQueries({ queryKey: ['triage-antecedents', patientId] });
  };

  const submitOtherAntecedent = async () => {
    if (!patientId || !otherAntecedent.trim()) return;
    await patientsApi.createAntecedent(patientId, { description: otherAntecedent.trim(), category: 'Triagem' });
    setOtherAntecedent('');
    setShowOtherAntecedent(false);
    queryClient.invalidateQueries({ queryKey: ['triage-antecedents', patientId] });
  };

  // Deduplicação longitudinal (regra 24): nunca insere se já existir uma
  // substância com o mesmo nome (case-insensitive) no cadastro do paciente —
  // preserva o histórico existente, nunca apaga/edita registros antigos.
  const submitAllergy = async () => {
    if (!patientId || !newAllergy.trim()) return;
    const already = (allergiesQuery.data ?? []).some(
      (a) => a.substance.trim().toLowerCase() === newAllergy.trim().toLowerCase(),
    );
    if (already) {
      setNewAllergy('');
      return;
    }
    await patientsApi.createAllergy(patientId, { substance: newAllergy.trim() });
    setNewAllergy('');
    queryClient.invalidateQueries({ queryKey: ['triage-allergies', patientId] });
  };

  // Deduplicação longitudinal (regra 23): mesmo princípio da alergia — nunca
  // cria "Losartana 50mg" de novo se "Losartana" já existir no cadastro.
  const submitMedication = async () => {
    if (!patientId || !newMedication.trim()) return;
    const already = (medicationsQuery.data ?? []).some(
      (m) => m.medication.trim().toLowerCase() === newMedication.trim().toLowerCase(),
    );
    if (already) {
      setNewMedication('');
      return;
    }
    await patientsApi.createContinuousMedication(patientId, { medication: newMedication.trim() });
    setNewMedication('');
    queryClient.invalidateQueries({ queryKey: ['triage-medications', patientId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      setErrorMsg('A queixa principal é obrigatória.');
      return;
    }
    if (!history.trim()) {
      setErrorMsg('A história da doença atual (HDA) é obrigatória.');
      return;
    }
    if (!riskColor) {
      setErrorMsg('Selecione a classificação de risco (Manchester).');
      return;
    }
    // Encaminhamento após triagem (Bloco 3) — validação-espelho da regra do
    // domínio (validateTriageDestination), pra dar feedback imediato antes
    // de bater na API; a API valida de novo, é a fonte de verdade real.
    if (!destinationType) {
      setErrorMsg('Selecione o encaminhamento após a triagem.');
      return;
    }
    if (destinationType === 'medical_consultation' && !destinationRoomId) {
      setErrorMsg('Selecione o consultório para encaminhar o paciente.');
      return;
    }
    if (destinationType === 'exam' && !destinationExamCategory) {
      setErrorMsg('Selecione o tipo de exame (laboratorial ou imagem).');
      return;
    }
    if (destinationType === 'procedure' && !destinationProcedureKind) {
      setErrorMsg('Selecione o procedimento.');
      return;
    }
    if (destinationType === 'procedure' && destinationProcedureKind === 'other' && !destinationProcedureOther.trim()) {
      setErrorMsg('Descreva o procedimento institucional.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await triagesApi.createTriage(encounterId, {
        chiefComplaint: chiefComplaint.trim(),
        history: history.trim(),
        vitals: {
          systolicBp: systolicBp ? Number(systolicBp) : null,
          diastolicBp: diastolicBp ? Number(diastolicBp) : null,
          heartRate: heartRate ? Number(heartRate) : null,
          respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
          temperature: temperature ? Number(temperature) : null,
          oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : null,
        },
        painScore,
        riskColor,
        notes: notes.trim() || null,
        initialAssessment: {
          generalCondition: generalCondition || null,
          consciousness: consciousness || null,
          airway: airway || null,
          breathing: breathing || null,
          circulation: circulation || null,
          skinFindings,
          skinFindingsOther: skinFindings.includes('other') ? skinFindingsOther.trim() || null : null,
        },
        pregnancy: {
          status: pregnancyStatus || null,
          weeks: pregnancyStatus === 'yes' && pregnancyWeeks ? Number(pregnancyWeeks) : null,
          obstetricNotes: pregnancyStatus === 'yes' ? obstetricNotes.trim() || null : null,
        },
        complaintDetail: {
          onsetAt: localDateTimeToIso(complaintOnsetAt),
          evolution: complaintEvolution || null,
          notes: complaintNotes.trim() || null,
        },
        painDetail: {
          location: painLocation.trim() || null,
          irradiation: painIrradiation.trim() || null,
          character: painCharacter.trim() || null,
          onsetAt: localDateTimeToIso(painOnsetAt),
          evolution: painEvolution || null,
        },
        destination: {
          type: destinationType,
          roomId: destinationType === 'medical_consultation' ? destinationRoomId : null,
          examCategory: destinationType === 'exam' ? destinationExamCategory || null : null,
          procedureKind: destinationType === 'procedure' ? destinationProcedureKind || null : null,
          procedureOther: destinationType === 'procedure' && destinationProcedureKind === 'other' ? destinationProcedureOther.trim() || null : null,
          notes: destinationNotes.trim() || null,
        },
      });

      // Bloco 5 (item 10) — confirmação objetiva do encaminhamento
      // realizado (destino, próximo fluxo, data/hora, profissional), sem
      // segurar o profissional numa tela extra — a Triagem não deve crescer.
      const destLabel = DESTINATION_TYPE_LABEL[created.destination.type as TriageDestinationType];
      const nextFlow = DESTINATION_NEXT_FLOW_LABEL[created.destination.type as TriageDestinationType];
      const lastEvent = created.destinationHistory[created.destinationHistory.length - 1];
      toast.success(
        `Encaminhamento realizado: ${destLabel}. Próximo fluxo: ${nextFlow}` +
          (lastEvent ? ` — ${new Date(lastEvent.setAt).toLocaleString('pt-BR')} por ${lastEvent.professionalName ?? 'profissional'}.` : '.'),
      );

      if (onSuccess) {
        onSuccess();
      } else {
        // Continuidade automática Triagem → Consulta (Fase 2 da reengenharia UX).
        window.location.hash = encounterRoute(encounterId, 'consulta');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao registrar triagem clínica.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Reclassificação (disponível somente quando já existe triagem registrada) ---
  const [newRiskColor, setNewRiskColor] = useState<ManchesterRiskColor | ''>('');
  const [reclassificationReason, setReclassificationReason] = useState('');
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [reclassifyError, setReclassifyError] = useState<string | null>(null);

  const handleReclassify = async () => {
    if (!newRiskColor) {
      setReclassifyError('Selecione o novo nível de prioridade.');
      return;
    }
    if (!reclassificationReason.trim()) {
      setReclassifyError('O motivo da reclassificação é obrigatório.');
      return;
    }
    if (!existingTriage) {
      setReclassifyError('Triagem não carregada — recarregue a página antes de reclassificar.');
      return;
    }
    setIsReclassifying(true);
    setReclassifyError(null);
    try {
      await triagesApi.reclassifyTriage(encounterId, {
        newRiskColor,
        reclassificationReason: reclassificationReason.trim(),
        // Lock otimista (Bloco 2.1) — o `updatedAt` que esta tela tinha
        // carregado; se outro profissional reclassificou entre a leitura e
        // este envio, o backend rejeita como CONCURRENCY_CONFLICT em vez de
        // sobrescrever silenciosamente.
        expectedUpdatedAt: existingTriage.updatedAt,
      });
      setNewRiskColor('');
      setReclassificationReason('');
      queryClient.invalidateQueries({ queryKey: ['triage', encounterId] });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'CONCURRENCY_CONFLICT') {
        // Recarrega o estado atual pra que uma nova tentativa já use o
        // `updatedAt` correto — sem isso o profissional ficaria preso
        // reenviando o mesmo valor desatualizado indefinidamente.
        queryClient.invalidateQueries({ queryKey: ['triage', encounterId] });
      }
      setReclassifyError(err instanceof ApiError ? err.message : 'Erro ao reclassificar atendimento.');
    } finally {
      setIsReclassifying(false);
    }
  };

  // Alterar encaminhamento (Bloco 3) — mesmo padrão de handleReclassify:
  // motivo obrigatório, lock otimista, conflito recarrega o estado atual.
  const handleChangeDestination = async () => {
    if (!changeDestType) {
      setChangeDestError('Selecione o novo tipo de encaminhamento.');
      return;
    }
    if (changeDestType === 'medical_consultation' && !changeDestRoomId) {
      setChangeDestError('Selecione o consultório para encaminhar o paciente.');
      return;
    }
    if (changeDestType === 'exam' && !changeDestExamCategory) {
      setChangeDestError('Selecione o tipo de exame (laboratorial ou imagem).');
      return;
    }
    if (changeDestType === 'procedure' && !changeDestProcedureKind) {
      setChangeDestError('Selecione o procedimento.');
      return;
    }
    if (changeDestType === 'procedure' && changeDestProcedureKind === 'other' && !changeDestProcedureOther.trim()) {
      setChangeDestError('Descreva o procedimento institucional.');
      return;
    }
    if (!changeDestReason.trim()) {
      setChangeDestError('O motivo da alteração do encaminhamento é obrigatório.');
      return;
    }
    if (!existingTriage) {
      setChangeDestError('Triagem não carregada — recarregue a página antes de alterar o encaminhamento.');
      return;
    }
    setIsChangingDestination(true);
    setChangeDestError(null);
    try {
      await triagesApi.changeDestination(encounterId, {
        type: changeDestType,
        roomId: changeDestType === 'medical_consultation' ? changeDestRoomId : null,
        examCategory: changeDestType === 'exam' ? changeDestExamCategory || null : null,
        procedureKind: changeDestType === 'procedure' ? changeDestProcedureKind || null : null,
        procedureOther: changeDestType === 'procedure' && changeDestProcedureKind === 'other' ? changeDestProcedureOther.trim() || null : null,
        notes: changeDestNotes.trim() || null,
        reason: changeDestReason.trim(),
        expectedUpdatedAt: existingTriage.updatedAt,
      });
      setChangeDestType('');
      setChangeDestRoomId('');
      setChangeDestExamCategory('');
      setChangeDestProcedureKind('');
      setChangeDestProcedureOther('');
      setChangeDestNotes('');
      setChangeDestReason('');
      queryClient.invalidateQueries({ queryKey: ['triage', encounterId] });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'CONCURRENCY_CONFLICT') {
        queryClient.invalidateQueries({ queryKey: ['triage', encounterId] });
      }
      setChangeDestError(err instanceof ApiError ? err.message : 'Erro ao alterar encaminhamento.');
    } finally {
      setIsChangingDestination(false);
    }
  };

  const patient = patientQuery.data;
  const encounter = encounterQuery.data;
  const patientAge = age(patient?.birthDate);
  const arrivalWait = encounter ? formatDuration(now.getTime() - new Date(encounter.createdAt).getTime()) : null;

  const activeLevel = useMemo(
    () => MANCHESTER_LEVELS.find((l) => l.color === (existingTriage ? existingTriage.riskColor : riskColor)) ?? null,
    [existingTriage, riskColor],
  );

  const returnAlert: ReturnAlertResult | null =
    encounter && patientEncountersQuery.data
      ? computeReturnAlert(patientEncountersQuery.data, encounterId, encounter.createdAt)
      : null;

  // Causa raiz do "abre e fecha sozinho" reportado (item 16): a etapa
  // anterior decidia formulário-vs-resumo com base só em `existingTriage`
  // (null enquanto carrega OU enquanto realmente não existe triagem) — para
  // um atendimento que JÁ tinha triagem registrada, isso fazia o formulário
  // vazio aparecer por um instante e, assim que `GET .../triage` respondia,
  // trocar sozinho para o resumo somente-leitura, parecendo um fechamento
  // automático. Corrigido mostrando um estado de carregamento explícito até
  // a consulta se resolver — só então decide qual dos dois modos renderizar.
  const triageStatusResolved = existingTriageQuery.isSuccess || existingTriageQuery.isError;

  return (
    <div className="min-w-0">
      <EncounterFlowNav encounterId={encounterId} current="triagem" backLabel="Voltar para a fila" {...(onBack ? { onBack } : {})} />

      {(encounterQuery.isLoading || patientQuery.isLoading) && (
        <p role="status" className="text-sm text-muted-foreground">Carregando dados do paciente…</p>
      )}

      {patient && encounter && (
        <Card className="mb-4 min-w-0 print:hidden">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-bold">{patient.fullName}</div>
                <div className="text-sm text-muted-foreground">
                  {patientAge != null ? `${patientAge} anos` : 'Idade não informada'} · {SEX_LABEL[patient.sex ?? ''] ?? 'Sexo não informado'}
                  {patient.birthDate ? ` · Nascimento: ${new Date(patient.birthDate).toLocaleDateString('pt-BR')}` : ''}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  CPF: {patient.cpf ?? '—'} · CNS: {patient.cns ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Atendimento: #{encounter.id.slice(0, 8)} · Chegada: {formatTimeOfDay(encounter.createdAt)} · Tempo de permanência: {arrivalWait}
                </div>
              </div>
              {activeLevel && (
                <Badge style={{ backgroundColor: activeLevel.bg, color: activeLevel.text }} className="shrink-0 text-sm">
                  {activeLevel.number} — {activeLevel.label}
                </Badge>
              )}
            </div>

            {/* Alertas assistenciais (item 26): puxados do cadastro
                longitudinal já carregado (alergias/antecedentes) + o alerta
                de retorno — nunca inventados, nunca geram decisão clínica. */}
            {(((allergiesQuery.data?.length ?? 0) > 0) || ((antecedentsQuery.data?.length ?? 0) > 0) || returnAlert?.level) && (
              <div className="flex flex-wrap gap-1.5">
                {(allergiesQuery.data ?? []).map((a) => (
                  <span key={a.id} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                    ⚠ Alergia: {a.substance}
                  </span>
                ))}
                {(antecedentsQuery.data ?? []).map((a) => (
                  <span key={a.id} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    ⚠ {a.description}
                  </span>
                ))}
                {returnAlert?.level === 'critical' && (
                  <button
                    type="button"
                    onClick={() => setShowReturnDetails(true)}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: 'var(--triage-red-bg)', color: 'var(--triage-red-text)' }}
                  >
                    🔴 Múltiplos retornos nas últimas {RETURN_ALERT_CONFIG.criticalWindowHours}h ({returnAlert.criticalEncounters.length})
                  </button>
                )}
                {returnAlert?.level === 'light' && (
                  <button
                    type="button"
                    onClick={() => setShowReturnDetails(true)}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
                  >
                    🟡 Retorno nos últimos {RETURN_ALERT_CONFIG.lightWindowDays} dias
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 print:hidden xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <Card className="min-w-0">
          <CardHeader>
            <Tabs defaultValue="triagem">
              <TabsList>
                <TabsTrigger value="triagem">Triagem</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="alergias">Alergias ({(allergiesQuery.data ?? []).length})</TabsTrigger>
                <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="triagem">
                {errorMsg && (
                  <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
                    {errorMsg}
                  </p>
                )}

                {!triageStatusResolved ? (
                  <p role="status" className="text-sm text-muted-foreground">Verificando se já existe triagem registrada…</p>
                ) : existingTriage ? (
                  <TriageReadOnlySummary triage={existingTriage} />
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="chiefComplaint" className="mb-1 block text-sm font-semibold">Queixa principal *</label>
                      <Textarea id="chiefComplaint" rows={3} maxLength={500} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Ex.: Dor no peito" required />
                      <div className="mt-0.5 text-right text-xs text-muted-foreground">{chiefComplaint.length}/500</div>
                    </div>

                    <div className="vl-intake-grid">
                      <div className="vl-intake-field">
                        <label htmlFor="complaintOnsetAt" className="mb-1 block text-sm font-semibold">Início da queixa</label>
                        <input id="complaintOnsetAt" type="datetime-local" value={complaintOnsetAt} onChange={(e) => setComplaintOnsetAt(e.target.value)} style={{ width: '100%', padding: 8 }} />
                      </div>
                      <div className="vl-intake-field">
                        <label htmlFor="complaintEvolution" className="mb-1 block text-sm font-semibold">Evolução</label>
                        <select id="complaintEvolution" value={complaintEvolution} onChange={(e) => setComplaintEvolution(e.target.value as TriageEvolution)} style={{ width: '100%', padding: 8 }}>
                          <option value="">Não informado</option>
                          {(Object.keys(EVOLUTION_LABEL) as TriageEvolution[]).map((v) => <option key={v} value={v}>{EVOLUTION_LABEL[v]}</option>)}
                        </select>
                      </div>
                      <div className="vl-intake-field--full">
                        <label htmlFor="complaintNotes" className="mb-1 block text-sm font-semibold">Observações relacionadas à queixa</label>
                        <Textarea id="complaintNotes" rows={2} value={complaintNotes} onChange={(e) => setComplaintNotes(e.target.value)} placeholder="Detalhes adicionais sobre a queixa…" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="history" className="mb-1 block text-sm font-semibold">História da doença atual (HDA) *</label>
                      <Textarea id="history" rows={5} maxLength={1000} value={history} onChange={(e) => setHistory(e.target.value)} placeholder="Início, evolução, intensidade, sinais associados…" required />
                      <div className="mt-0.5 text-right text-xs text-muted-foreground">{history.length}/1000</div>
                    </div>

                    <div>
                      <span className="mb-2 block text-sm font-semibold">Avaliação inicial</span>
                      <div className="vl-intake-grid">
                        <div className="vl-intake-field">
                          <label htmlFor="generalCondition" className="mb-1 block text-xs font-semibold text-muted-foreground">Estado geral</label>
                          <select id="generalCondition" value={generalCondition} onChange={(e) => setGeneralCondition(e.target.value as TriageGeneralCondition)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(GENERAL_CONDITION_LABEL) as TriageGeneralCondition[]).map((v) => <option key={v} value={v}>{GENERAL_CONDITION_LABEL[v]}</option>)}
                          </select>
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="consciousness" className="mb-1 block text-xs font-semibold text-muted-foreground">Nível de consciência</label>
                          <select id="consciousness" value={consciousness} onChange={(e) => setConsciousness(e.target.value as TriageConsciousness)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(CONSCIOUSNESS_LABEL) as TriageConsciousness[]).map((v) => <option key={v} value={v}>{CONSCIOUSNESS_LABEL[v]}</option>)}
                          </select>
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="airway" className="mb-1 block text-xs font-semibold text-muted-foreground">Via aérea</label>
                          <select id="airway" value={airway} onChange={(e) => setAirway(e.target.value as TriageAirway)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(AIRWAY_LABEL) as TriageAirway[]).map((v) => <option key={v} value={v}>{AIRWAY_LABEL[v]}</option>)}
                          </select>
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="breathing" className="mb-1 block text-xs font-semibold text-muted-foreground">Respiração</label>
                          <select id="breathing" value={breathing} onChange={(e) => setBreathing(e.target.value as TriageBreathing)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(BREATHING_LABEL) as TriageBreathing[]).map((v) => <option key={v} value={v}>{BREATHING_LABEL[v]}</option>)}
                          </select>
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="circulation" className="mb-1 block text-xs font-semibold text-muted-foreground">Circulação/perfusão</label>
                          <select id="circulation" value={circulation} onChange={(e) => setCirculation(e.target.value as TriageCirculation)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(CIRCULATION_LABEL) as TriageCirculation[]).map((v) => <option key={v} value={v}>{CIRCULATION_LABEL[v]}</option>)}
                          </select>
                        </div>
                        <div className="vl-intake-field--full">
                          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Pele (múltipla escolha)</span>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {(Object.keys(SKIN_FINDING_LABEL) as TriageSkinFinding[]).map((finding) => (
                              <label key={finding} className="flex items-center gap-1.5 text-sm">
                                <input type="checkbox" checked={skinFindings.includes(finding)} onChange={() => toggleSkinFinding(finding)} />
                                {SKIN_FINDING_LABEL[finding]}
                              </label>
                            ))}
                          </div>
                          {skinFindings.includes('other') && (
                            <input
                              type="text"
                              value={skinFindingsOther}
                              onChange={(e) => setSkinFindingsOther(e.target.value)}
                              placeholder="Descreva a característica de pele…"
                              className="mt-2 min-w-0"
                              style={{ width: '100%', padding: 6 }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-sm font-semibold">Antecedentes relevantes</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {QUICK_ANTECEDENTS.map((label) => {
                          const checked = (antecedentsQuery.data ?? []).some(
                            (a: PatientAntecedent) => a.description.toLowerCase() === label.toLowerCase(),
                          );
                          return (
                            <label key={label} className="flex items-center gap-1.5 text-sm">
                              <input type="checkbox" checked={checked} disabled={checked} onChange={() => void toggleAntecedent(label)} />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                      {showOtherAntecedent && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            type="text"
                            value={otherAntecedent}
                            onChange={(e) => setOtherAntecedent(e.target.value)}
                            placeholder="Descreva o antecedente…"
                            className="min-w-0 flex-1 basis-[160px]"
                            style={{ padding: 6 }}
                          />
                          <Button type="button" size="sm" onClick={() => void submitOtherAntecedent()}>Adicionar</Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Sinais vitais</span>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowVitalsHistory(true)}>
                            Registrar sinais vitais anteriores
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <VitalField label="PA (mmHg)" abnormal={isBpAbnormal(systolicBp ? Number(systolicBp) : null, diastolicBp ? Number(diastolicBp) : null)}>
                          <div className="flex items-center gap-1">
                            <input type="number" value={systolicBp} onChange={(e) => setSystolicBp(e.target.value)} placeholder="120" style={{ width: '100%', padding: 6 }} aria-label="PA Sistólica (mmHg)" />
                            <span>/</span>
                            <input type="number" value={diastolicBp} onChange={(e) => setDiastolicBp(e.target.value)} placeholder="80" style={{ width: '100%', padding: 6 }} aria-label="PA Diastólica (mmHg)" />
                          </div>
                        </VitalField>
                        <VitalField label="FC (bpm)" abnormal={isHrAbnormal(heartRate ? Number(heartRate) : null)}>
                          <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="75" style={{ width: '100%', padding: 6 }} aria-label="Freq. Cardíaca (bpm)" />
                        </VitalField>
                        <VitalField label="FR (irpm)" abnormal={isRrAbnormal(respiratoryRate ? Number(respiratoryRate) : null)}>
                          <input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" style={{ width: '100%', padding: 6 }} aria-label="Freq. Respiratória (irpm)" />
                        </VitalField>
                        <VitalField label="Temp. (°C)" abnormal={isTempAbnormal(temperature ? Number(temperature) : null)}>
                          <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36,5" style={{ width: '100%', padding: 6 }} aria-label="Temperatura (°C)" />
                        </VitalField>
                        <VitalField label="SpO₂ (%)" abnormal={isSpo2Abnormal(oxygenSaturation ? Number(oxygenSaturation) : null)}>
                          <input type="number" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} placeholder="98" style={{ width: '100%', padding: 6 }} aria-label="Sat. Oxigênio (%)" />
                        </VitalField>
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-sm font-semibold">Avaliação da dor</span>
                      <div className="mb-3 flex items-end gap-4">
                        <div className="min-w-[220px] flex-1">
                          <label htmlFor="painScore" className="mb-1 block text-xs font-semibold text-muted-foreground">Intensidade (0 — sem dor, 10 — pior dor possível)</label>
                          <div className="flex items-center gap-3">
                            <input id="painScore" type="range" min={0} max={10} value={painScore} onChange={(e) => setPainScore(Number(e.target.value))} className="min-w-0 flex-1" />
                            <span
                              className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-bold"
                              style={{
                                backgroundColor: painScore >= 7 ? 'var(--triage-red-bg)' : painScore >= 4 ? 'var(--triage-yellow-bg)' : 'var(--color-surface-sunken)',
                                color: painScore >= 7 ? 'var(--triage-red-text)' : painScore >= 4 ? 'var(--triage-yellow-text)' : 'var(--color-text)',
                              }}
                            >
                              {painScore}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="vl-intake-grid">
                        <div className="vl-intake-field">
                          <label htmlFor="painLocation" className="mb-1 block text-xs font-semibold text-muted-foreground">Localização</label>
                          <input id="painLocation" type="text" value={painLocation} onChange={(e) => setPainLocation(e.target.value)} placeholder="Ex.: Região epigástrica" style={{ width: '100%', padding: 6 }} />
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="painIrradiation" className="mb-1 block text-xs font-semibold text-muted-foreground">Irradiação</label>
                          <input id="painIrradiation" type="text" value={painIrradiation} onChange={(e) => setPainIrradiation(e.target.value)} placeholder="Ex.: Membro superior esquerdo" style={{ width: '100%', padding: 6 }} />
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="painCharacter" className="mb-1 block text-xs font-semibold text-muted-foreground">Característica</label>
                          <input id="painCharacter" type="text" value={painCharacter} onChange={(e) => setPainCharacter(e.target.value)} placeholder="Ex.: Queimação, cólica, pontada…" style={{ width: '100%', padding: 6 }} />
                        </div>
                        <div className="vl-intake-field">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label htmlFor="painOnsetAt" className="block text-xs font-semibold text-muted-foreground">Início</label>
                            {complaintOnsetAt && (
                              <button type="button" onClick={() => setPainOnsetAt(complaintOnsetAt)} className="text-xs" style={{ color: 'var(--color-primary)' }}>
                                usar horário da queixa
                              </button>
                            )}
                          </div>
                          <input id="painOnsetAt" type="datetime-local" value={painOnsetAt} onChange={(e) => setPainOnsetAt(e.target.value)} style={{ width: '100%', padding: 6 }} />
                        </div>
                        <div className="vl-intake-field">
                          <label htmlFor="painEvolution" className="mb-1 block text-xs font-semibold text-muted-foreground">Evolução</label>
                          <select id="painEvolution" value={painEvolution} onChange={(e) => setPainEvolution(e.target.value as TriageEvolution)} style={{ width: '100%', padding: 6 }}>
                            <option value="">Não informado</option>
                            {(Object.keys(EVOLUTION_LABEL) as TriageEvolution[]).map((v) => <option key={v} value={v}>{EVOLUTION_LABEL[v]}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Gestação (Bloco 1) — a seção é sempre visível e nunca
                        bloqueia "Não informado"; sexo/idade do paciente NÃO são
                        usados pra esconder ou pré-selecionar nada (regra 6:
                        "não presumir gravidez", "não usar essa informação pra
                        bloquear o profissional de registrar"). */}
                    <div>
                      <span className="mb-2 block text-sm font-semibold">Gestação</span>
                      <div className="flex flex-wrap gap-4">
                        {(Object.keys(PREGNANCY_STATUS_LABEL) as TriagePregnancyStatus[]).map((v) => (
                          <label key={v} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name="pregnancyStatus" checked={pregnancyStatus === v} onChange={() => setPregnancyStatus(v)} />
                            {PREGNANCY_STATUS_LABEL[v]}
                          </label>
                        ))}
                      </div>
                      {pregnancyStatus === 'yes' && (
                        <div className="vl-intake-grid mt-2">
                          <div className="vl-intake-field">
                            <label htmlFor="pregnancyWeeks" className="mb-1 block text-xs font-semibold text-muted-foreground">Idade gestacional (semanas)</label>
                            <input id="pregnancyWeeks" type="number" min={0} max={45} value={pregnancyWeeks} onChange={(e) => setPregnancyWeeks(e.target.value)} style={{ width: '100%', padding: 6 }} />
                          </div>
                          <div className="vl-intake-field--full">
                            <label htmlFor="obstetricNotes" className="mb-1 block text-xs font-semibold text-muted-foreground">Observações obstétricas</label>
                            <Textarea id="obstetricNotes" rows={2} value={obstetricNotes} onChange={(e) => setObstetricNotes(e.target.value)} placeholder="Observações relevantes…" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="notes" className="mb-1 block text-sm font-semibold">Observações adicionais</label>
                      <Textarea id="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Digite observações adicionais da triagem…" />
                      <div className="mt-0.5 text-right text-xs text-muted-foreground">{notes.length}/500</div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={clearDraft}>Limpar dados</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando…' : 'Finalizar triagem'}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="historico">
                {(timelineQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem eventos no histórico deste paciente.</p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm">
                    {(timelineQuery.data ?? []).slice(0, 20).map((ev) => (
                      <li key={ev.eventId} className="border-b border-border pb-2">
                        <span className="text-muted-foreground">{formatTimeOfDay(ev.occurredAt)} — </span>
                        {ev.type}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="alergias">
                <p className="mb-2 text-xs text-muted-foreground">Dado longitudinal do paciente — vale para todos os atendimentos, não só este.</p>
                {(allergiesQuery.data ?? []).length === 0 ? (
                  <p className="mb-3 text-sm text-muted-foreground">Nenhuma alergia registrada.</p>
                ) : (
                  <ul className="mb-3 flex flex-col gap-2 text-sm">
                    {(allergiesQuery.data ?? []).map((a) => (
                      <li key={a.id} className="border-b border-border pb-2">
                        <strong>{a.substance}</strong> — {a.reaction ?? 'reação não especificada'} ({a.severity})
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)} placeholder="Nome da substância…" className="min-w-0 flex-1 basis-[160px]" style={{ padding: 6 }} />
                  <Button type="button" size="sm" onClick={() => void submitAllergy()}>Adicionar</Button>
                </div>
              </TabsContent>

              <TabsContent value="medicamentos">
                <p className="mb-2 text-xs text-muted-foreground">Dado longitudinal do paciente — vale para todos os atendimentos, não só este.</p>
                {(medicationsQuery.data ?? []).length === 0 ? (
                  <p className="mb-3 text-sm text-muted-foreground">Nenhum medicamento de uso contínuo registrado.</p>
                ) : (
                  <ul className="mb-3 flex flex-col gap-2 text-sm">
                    {(medicationsQuery.data ?? []).map((m) => (
                      <li key={m.id} className="border-b border-border pb-2">
                        <strong>{m.medication}</strong> {m.dose ? `— ${m.dose}` : ''} {m.frequency ? `(${m.frequency})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={newMedication} onChange={(e) => setNewMedication(e.target.value)} placeholder="Ex.: Losartana 50mg…" className="min-w-0 flex-1 basis-[160px]" style={{ padding: 6 }} />
                  <Button type="button" size="sm" onClick={() => void submitMedication()}>Adicionar</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader>
              <strong className="text-base">Classificação de risco (Manchester) *</strong>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {MANCHESTER_LEVELS.map((level) => (
                <label
                  key={level.color}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5"
                  style={{ borderColor: (existingTriage ? existingTriage.riskColor : riskColor) === level.color ? level.bg : 'var(--color-border)' }}
                >
                  <input
                    type="radio"
                    name="riskColor"
                    value={level.color}
                    checked={(existingTriage ? existingTriage.riskColor : riskColor) === level.color}
                    disabled={!!existingTriage}
                    onChange={() => setRiskColor(level.color)}
                    className="mt-1"
                  />
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: level.bg, color: level.text }}
                  >
                    {level.number}
                  </span>
                  <span className="min-w-0">
                    <div className="text-sm font-semibold">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.description}</div>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <strong className="text-base">Reclassificar atendimento</strong>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {!existingTriage ? (
                <p className="text-xs text-muted-foreground">Disponível após a triagem inicial ser finalizada.</p>
              ) : (
                <>
                  {reclassifyError && (
                    <p role="alert" className="rounded-md bg-[var(--color-danger-soft)] px-2 py-1.5 text-xs text-[var(--color-danger)]">
                      {reclassifyError}
                    </p>
                  )}
                  <div>
                    <label htmlFor="newRiskColor" className="mb-1 block text-xs font-semibold">Novo nível de prioridade</label>
                    <select id="newRiskColor" value={newRiskColor} onChange={(e) => setNewRiskColor(e.target.value as ManchesterRiskColor)} style={{ width: '100%', padding: 6 }}>
                      <option value="">Selecione…</option>
                      {MANCHESTER_LEVELS.map((l) => (
                        <option key={l.color} value={l.color}>{l.number} — {l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reclassificationReason" className="mb-1 block text-xs font-semibold">Motivo da reclassificação</label>
                    <Textarea id="reclassificationReason" rows={2} maxLength={300} value={reclassificationReason} onChange={(e) => setReclassificationReason(e.target.value)} placeholder="Descreva o motivo…" />
                    <div className="mt-0.5 text-right text-xs text-muted-foreground">{reclassificationReason.length}/300</div>
                  </div>
                  <Button type="button" onClick={() => void handleReclassify()} disabled={isReclassifying}>
                    {isReclassifying ? 'Reclassificando…' : 'Reclassificar'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Histórico de classificação (Bloco 2) — somente leitura, nunca
              editável pela interface (regra 9/27). Mostra TODOS os eventos
              já registrados (classificação inicial + cada reclassificação),
              mais recente primeiro — nenhum é apagado/sobrescrito ao
              reclassificar de novo. */}
          {existingTriage && existingTriage.classificationHistory.length > 0 && (
            <Card className="min-w-0">
              <CardHeader>
                <strong className="text-base">Histórico de classificação</strong>
              </CardHeader>
              <CardContent>
                <ClassificationHistoryTimeline events={existingTriage.classificationHistory} />
              </CardContent>
            </Card>
          )}

          {/* Encaminhamento após triagem (Bloco 3) — regra operacional da
              UPA: todo paciente de fluxo médico vai para um consultório
              disponível; Sala Vermelha é exceção operacional (nunca
              derivada automaticamente da cor Manchester — não há nenhum
              `if riskColor === 'red'` aqui, a escolha é sempre explícita do
              profissional); Exame/Procedimento cobrem quem veio só por
              isso. "Leito comum"/"internação" propositalmente não existem
              como opção — são decisão médica posterior. */}
          {!existingTriage ? (
            <Card className="min-w-0">
              <CardHeader>
                <strong className="text-base">Encaminhamento após triagem *</strong>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1.5">
                  {(Object.keys(DESTINATION_TYPE_LABEL) as TriageDestinationType[]).map((type) => (
                    <label key={type} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name="destinationType" checked={destinationType === type} onChange={() => setDestinationType(type)} />
                      {DESTINATION_TYPE_LABEL[type]}
                    </label>
                  ))}
                </div>

                {destinationType && (
                  <p className="text-xs text-muted-foreground">Próximo fluxo: {DESTINATION_NEXT_FLOW_LABEL[destinationType]}</p>
                )}

                {destinationType === 'medical_consultation' && (
                  <div>
                    <label htmlFor="destinationRoomId" className="mb-1 block text-xs font-semibold">Consultório disponível</label>
                    <select id="destinationRoomId" value={destinationRoomId} onChange={(e) => setDestinationRoomId(e.target.value)} style={{ width: '100%', padding: 6 }}>
                      <option value="">Selecione…</option>
                      {(roomsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}

                {destinationType === 'exam' && (
                  <div>
                    <label htmlFor="destinationExamCategory" className="mb-1 block text-xs font-semibold">Tipo de exame</label>
                    <select id="destinationExamCategory" value={destinationExamCategory} onChange={(e) => setDestinationExamCategory(e.target.value as TriageExamCategory)} style={{ width: '100%', padding: 6 }}>
                      <option value="">Selecione…</option>
                      {(Object.keys(EXAM_CATEGORY_LABEL) as TriageExamCategory[]).map((c) => <option key={c} value={c}>{EXAM_CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </div>
                )}

                {destinationType === 'procedure' && (
                  <>
                    <div>
                      <label htmlFor="destinationProcedureKind" className="mb-1 block text-xs font-semibold">Procedimento</label>
                      <select id="destinationProcedureKind" value={destinationProcedureKind} onChange={(e) => setDestinationProcedureKind(e.target.value as TriageProcedureKind)} style={{ width: '100%', padding: 6 }}>
                        <option value="">Selecione…</option>
                        {(Object.keys(PROCEDURE_KIND_LABEL) as TriageProcedureKind[]).map((k) => <option key={k} value={k}>{PROCEDURE_KIND_LABEL[k]}</option>)}
                      </select>
                    </div>
                    {destinationProcedureKind === 'other' && (
                      <div>
                        <label htmlFor="destinationProcedureOther" className="mb-1 block text-xs font-semibold">Descrição do procedimento *</label>
                        <input id="destinationProcedureOther" type="text" value={destinationProcedureOther} onChange={(e) => setDestinationProcedureOther(e.target.value)} placeholder="Ex.: Retirada de pontos" style={{ width: '100%', padding: 6 }} />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label htmlFor="destinationNotes" className="mb-1 block text-xs font-semibold">Observação (opcional)</label>
                  <Textarea id="destinationNotes" rows={2} value={destinationNotes} onChange={(e) => setDestinationNotes(e.target.value)} placeholder="Ex.: Paciente deverá aguardar chamada no consultório." />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="min-w-0">
                <CardHeader>
                  <strong className="text-base">Destino atual</strong>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {existingTriage.destination.type ? (
                    <>
                      <div className="text-sm font-semibold">{DESTINATION_TYPE_LABEL[existingTriage.destination.type]}</div>
                      {existingTriage.destination.type === 'medical_consultation' && (
                        <div className="text-sm">{(roomsQuery.data ?? []).find((r) => r.id === existingTriage.destination.roomId)?.name ?? '—'}</div>
                      )}
                      {existingTriage.destination.type === 'exam' && existingTriage.destination.examCategory && (
                        <div className="text-sm">{EXAM_CATEGORY_LABEL[existingTriage.destination.examCategory]}</div>
                      )}
                      {existingTriage.destination.type === 'procedure' && existingTriage.destination.procedureKind && (
                        <div className="text-sm">
                          {PROCEDURE_KIND_LABEL[existingTriage.destination.procedureKind]}
                          {existingTriage.destination.procedureKind === 'other' && existingTriage.destination.procedureOther ? `: ${existingTriage.destination.procedureOther}` : ''}
                        </div>
                      )}
                      {existingTriage.destination.notes && <p className="text-xs text-muted-foreground">{existingTriage.destination.notes}</p>}
                      <p className="text-xs text-muted-foreground">Próximo fluxo: {DESTINATION_NEXT_FLOW_LABEL[existingTriage.destination.type]}</p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {existingTriage.destination.setAt ? new Date(existingTriage.destination.setAt).toLocaleString('pt-BR') : ''}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Destino não definido.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader>
                  <strong className="text-base">Alterar encaminhamento</strong>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5">
                  {changeDestError && (
                    <p role="alert" className="rounded-md bg-[var(--color-danger-soft)] px-2 py-1.5 text-xs text-[var(--color-danger)]">
                      {changeDestError}
                    </p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {(Object.keys(DESTINATION_TYPE_LABEL) as TriageDestinationType[]).map((type) => (
                      <label key={type} className="flex items-center gap-1.5 text-sm">
                        <input type="radio" name="changeDestinationType" checked={changeDestType === type} onChange={() => setChangeDestType(type)} />
                        {DESTINATION_TYPE_LABEL[type]}
                      </label>
                    ))}
                  </div>
                  {changeDestType === 'medical_consultation' && (
                    <select value={changeDestRoomId} onChange={(e) => setChangeDestRoomId(e.target.value)} style={{ width: '100%', padding: 6 }}>
                      <option value="">Selecione o consultório…</option>
                      {(roomsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                  {changeDestType === 'exam' && (
                    <select value={changeDestExamCategory} onChange={(e) => setChangeDestExamCategory(e.target.value as TriageExamCategory)} style={{ width: '100%', padding: 6 }}>
                      <option value="">Selecione o tipo de exame…</option>
                      {(Object.keys(EXAM_CATEGORY_LABEL) as TriageExamCategory[]).map((c) => <option key={c} value={c}>{EXAM_CATEGORY_LABEL[c]}</option>)}
                    </select>
                  )}
                  {changeDestType === 'procedure' && (
                    <>
                      <select value={changeDestProcedureKind} onChange={(e) => setChangeDestProcedureKind(e.target.value as TriageProcedureKind)} style={{ width: '100%', padding: 6 }}>
                        <option value="">Selecione o procedimento…</option>
                        {(Object.keys(PROCEDURE_KIND_LABEL) as TriageProcedureKind[]).map((k) => <option key={k} value={k}>{PROCEDURE_KIND_LABEL[k]}</option>)}
                      </select>
                      {changeDestProcedureKind === 'other' && (
                        <input type="text" value={changeDestProcedureOther} onChange={(e) => setChangeDestProcedureOther(e.target.value)} placeholder="Descreva o procedimento…" style={{ width: '100%', padding: 6 }} />
                      )}
                    </>
                  )}
                  <div>
                    <label htmlFor="changeDestReason" className="mb-1 block text-xs font-semibold">Motivo da alteração *</label>
                    <Textarea id="changeDestReason" rows={2} maxLength={300} value={changeDestReason} onChange={(e) => setChangeDestReason(e.target.value)} placeholder="Descreva o motivo…" />
                  </div>
                  <Button type="button" onClick={() => void handleChangeDestination()} disabled={isChangingDestination}>
                    {isChangingDestination ? 'Alterando…' : 'Alterar encaminhamento'}
                  </Button>
                </CardContent>
              </Card>

              {existingTriage.destinationHistory.length > 0 && (
                <Card className="min-w-0">
                  <CardHeader>
                    <strong className="text-base">Histórico de encaminhamento</strong>
                  </CardHeader>
                  <CardContent>
                    <DestinationHistoryTimeline events={existingTriage.destinationHistory} rooms={roomsQuery.data ?? []} />
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Card className="min-w-0">
            <CardContent className="flex flex-col gap-1 p-4 text-xs text-muted-foreground">
              <div><strong className="text-foreground">Profissional responsável:</strong> você (usuário autenticado)</div>
              <div><strong className="text-foreground">Data e hora:</strong> {now.toLocaleDateString('pt-BR')} {formatTimeOfDay(now.toISOString())}</div>
            </CardContent>
          </Card>

          <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
            🖨 Imprimir ficha da triagem
          </Button>
        </div>
      </div>

      {patient && encounter && (
        <PrintableTriageSummary
          patient={patient}
          patientAge={patientAge}
          encounter={encounter}
          triage={existingTriage}
          activeLevel={activeLevel}
          returnAlert={returnAlert}
          allergies={allergiesQuery.data ?? []}
          antecedents={antecedentsQuery.data ?? []}
          rooms={roomsQuery.data ?? []}
        />
      )}

      {showVitalsHistory && (
        <Overlay title="Sinais vitais anteriores deste atendimento" onClose={() => setShowVitalsHistory(false)}>
          <VitalsHistoryList encounterId={encounterId} vitalSignsApi={vitalSignsApi} />
        </Overlay>
      )}

      {showReturnDetails && returnAlert && (
        <Overlay title="Retornos recentes" onClose={() => setShowReturnDetails(false)}>
          <ReturnAlertDetails alert={returnAlert} />
        </Overlay>
      )}
    </div>
  );
};

const VitalField: React.FC<{ label: string; abnormal: boolean; children: React.ReactNode }> = ({ label, abnormal, children }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
    <div style={{ color: abnormal ? 'var(--color-danger)' : undefined, fontWeight: abnormal ? 700 : undefined }}>{children}</div>
  </div>
);

const TriageReadOnlySummary: React.FC<{ triage: Triage }> = ({ triage }) => (
  <div className="flex flex-col gap-4">
    <p role="status" className="rounded-md bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-success)]">
      Triagem registrada em {formatTimeOfDay(triage.performedAt)} — avaliação inicial concluída.
    </p>
    <div>
      <span className="mb-1 block text-sm font-semibold">Queixa principal</span>
      <p className="text-sm">{triage.chiefComplaint}</p>
    </div>
    <div>
      <span className="mb-1 block text-sm font-semibold">História da doença atual (HDA)</span>
      <p className="text-sm">{triage.history ?? '—'}</p>
    </div>

    {(triage.complaintDetail.onsetAt || triage.complaintDetail.evolution || triage.complaintDetail.notes) && (
      <div>
        <span className="mb-1 block text-sm font-semibold">Início/evolução da queixa</span>
        <p className="text-sm">
          {triage.complaintDetail.onsetAt ? new Date(triage.complaintDetail.onsetAt).toLocaleString('pt-BR') : '—'}
          {triage.complaintDetail.evolution ? ` · ${EVOLUTION_LABEL[triage.complaintDetail.evolution]}` : ''}
        </p>
        {triage.complaintDetail.notes && <p className="text-sm text-muted-foreground">{triage.complaintDetail.notes}</p>}
      </div>
    )}

    {(triage.initialAssessment.generalCondition || triage.initialAssessment.consciousness || triage.initialAssessment.airway || triage.initialAssessment.breathing || triage.initialAssessment.circulation || (triage.initialAssessment.skinFindings?.length ?? 0) > 0) && (
      <div>
        <span className="mb-2 block text-sm font-semibold">Avaliação inicial</span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
          <div><span className="text-xs text-muted-foreground">Estado geral</span><div>{triage.initialAssessment.generalCondition ? GENERAL_CONDITION_LABEL[triage.initialAssessment.generalCondition] : '—'}</div></div>
          <div><span className="text-xs text-muted-foreground">Consciência</span><div>{triage.initialAssessment.consciousness ? CONSCIOUSNESS_LABEL[triage.initialAssessment.consciousness] : '—'}</div></div>
          <div><span className="text-xs text-muted-foreground">Via aérea</span><div>{triage.initialAssessment.airway ? AIRWAY_LABEL[triage.initialAssessment.airway] : '—'}</div></div>
          <div><span className="text-xs text-muted-foreground">Respiração</span><div>{triage.initialAssessment.breathing ? BREATHING_LABEL[triage.initialAssessment.breathing] : '—'}</div></div>
          <div><span className="text-xs text-muted-foreground">Circulação/perfusão</span><div>{triage.initialAssessment.circulation ? CIRCULATION_LABEL[triage.initialAssessment.circulation] : '—'}</div></div>
          <div>
            <span className="text-xs text-muted-foreground">Pele</span>
            <div>{(triage.initialAssessment.skinFindings ?? []).map((f) => SKIN_FINDING_LABEL[f]).join(', ') || '—'}{triage.initialAssessment.skinFindingsOther ? ` (${triage.initialAssessment.skinFindingsOther})` : ''}</div>
          </div>
        </div>
      </div>
    )}

    <div>
      <span className="mb-2 block text-sm font-semibold">Sinais vitais</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 text-sm">
        <div><span className="text-xs text-muted-foreground">PA (mmHg)</span><div>{triage.vitals.systolicBp ?? '—'}/{triage.vitals.diastolicBp ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">FC (bpm)</span><div>{triage.vitals.heartRate ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">FR (irpm)</span><div>{triage.vitals.respiratoryRate ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Temp. (°C)</span><div>{triage.vitals.temperature ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">SpO₂ (%)</span><div>{triage.vitals.oxygenSaturation ?? '—'}</div></div>
      </div>
    </div>
    <div>
      <span className="mb-2 block text-sm font-semibold">Avaliação da dor</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
        <div><span className="text-xs text-muted-foreground">Intensidade (0–10)</span><div>{triage.painScore ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Localização</span><div>{triage.painDetail.location ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Irradiação</span><div>{triage.painDetail.irradiation ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Característica</span><div>{triage.painDetail.character ?? '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Início</span><div>{triage.painDetail.onsetAt ? new Date(triage.painDetail.onsetAt).toLocaleString('pt-BR') : '—'}</div></div>
        <div><span className="text-xs text-muted-foreground">Evolução</span><div>{triage.painDetail.evolution ? EVOLUTION_LABEL[triage.painDetail.evolution] : '—'}</div></div>
      </div>
    </div>

    {triage.pregnancy.status && (
      <div>
        <span className="mb-1 block text-sm font-semibold">Gestação</span>
        <p className="text-sm">
          {PREGNANCY_STATUS_LABEL[triage.pregnancy.status]}
          {triage.pregnancy.status === 'yes' && triage.pregnancy.weeks != null ? ` — ${triage.pregnancy.weeks} semanas` : ''}
        </p>
        {triage.pregnancy.obstetricNotes && <p className="text-sm text-muted-foreground">{triage.pregnancy.obstetricNotes}</p>}
      </div>
    )}

    {triage.notes && (
      <div>
        <span className="mb-1 block text-sm font-semibold">Observações adicionais</span>
        <p className="text-sm">{triage.notes}</p>
      </div>
    )}
  </div>
);

const VitalsHistoryList: React.FC<{ encounterId: string; vitalSignsApi: ReturnType<typeof createVitalSignsApi> }> = ({ encounterId, vitalSignsApi }) => {
  const readingsQuery = useQuery({
    queryKey: ['vital-signs-history', encounterId],
    queryFn: () => vitalSignsApi.listReadings(encounterId),
  });

  if (readingsQuery.isLoading) return <p role="status" className="text-sm text-muted-foreground">Carregando…</p>;
  const readings = readingsQuery.data ?? [];
  if (readings.length === 0) return <p className="text-sm text-muted-foreground">Nenhum registro anterior de sinais vitais para este atendimento.</p>;

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {readings.map((r) => (
        <li key={r.id} className="border-b border-border pb-2">
          <div className="text-xs text-muted-foreground">{formatTimeOfDay(r.createdAt)} · origem: {r.source}</div>
          <div>
            PA {r.vitals.systolicBp ?? '—'}/{r.vitals.diastolicBp ?? '—'} · FC {r.vitals.heartRate ?? '—'} · FR {r.vitals.respiratoryRate ?? '—'} · Temp. {r.vitals.temperature ?? '—'} · SpO₂ {r.vitals.oxygenSaturation ?? '—'}
          </div>
        </li>
      ))}
    </ul>
  );
};

/**
 * Detalhamento do alerta de retorno (item 11) — mostra somente atendimentos
 * que já existem no sistema (`app.encounters`), nada inventado. Reaproveita
 * `ENCOUNTER_STATUS_LABEL` já existente (Fase 2/3 da reengenharia UX) em vez
 * de recriar rótulos de status.
 */
const ReturnAlertDetails: React.FC<{ alert: ReturnAlertResult }> = ({ alert }) => {
  const list = alert.level === 'critical' ? alert.criticalEncounters : alert.lightEncounters;
  return (
    <div className="flex flex-col gap-3">
      <p
        className="rounded-md px-3 py-2 text-sm font-semibold"
        style={
          alert.level === 'critical'
            ? { background: 'var(--triage-red-bg)', color: 'var(--triage-red-text)' }
            : { background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }
        }
      >
        {alert.level === 'critical'
          ? `🔴 Múltiplos retornos nas últimas ${RETURN_ALERT_CONFIG.criticalWindowHours} horas`
          : `🟡 Retorno nos últimos ${RETURN_ALERT_CONFIG.lightWindowDays} dias`}
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {list.map((e) => (
          <li key={e.id} className="border-b border-border pb-2">
            <div className="font-semibold">Atendimento #{e.id.slice(0, 8)}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleDateString('pt-BR')} — {formatTimeOfDay(e.createdAt)}
            </div>
            <div>Queixa: {e.chiefComplaint || '—'}</div>
            <div className="text-xs text-muted-foreground">Status: {ENCOUNTER_STATUS_LABEL[e.status]}</div>
          </li>
        ))}
      </ul>
      <a href="#/atendimentos" className="text-sm">Ver histórico completo →</a>
    </div>
  );
};

/**
 * Ficha de impressão (item 31) — visível apenas em `@media print`
 * (`.vl-print-only`, definido em global.css). Não imprime menus/botões:
 * todo o resto da tela leva `print:hidden`. Mostra só dados que já existem
 * no sistema — sem inventar campos.
 */
const PrintableTriageSummary: React.FC<{
  patient: Patient;
  patientAge: number | null;
  encounter: Encounter;
  triage: Triage | null;
  activeLevel: (typeof MANCHESTER_LEVELS)[number] | null;
  returnAlert: ReturnAlertResult | null;
  allergies: readonly PatientAllergy[];
  antecedents: readonly PatientAntecedent[];
  rooms: readonly { id: string; name: string }[];
}> = ({ patient, patientAge, encounter, triage, activeLevel, returnAlert, allergies, antecedents, rooms }) => (
  <div className="vl-print-only hidden">
    <h1>Ficha de Triagem</h1>
    <p>
      <strong>{patient.fullName}</strong> — {patientAge != null ? `${patientAge} anos` : 'idade não informada'} —{' '}
      {SEX_LABEL[patient.sex ?? ''] ?? 'sexo não informado'}
    </p>
    <p>CPF: {patient.cpf ?? '—'} · CNS: {patient.cns ?? '—'}</p>
    <p>
      Atendimento #{encounter.id.slice(0, 8)} · Chegada: {new Date(encounter.createdAt).toLocaleString('pt-BR')}
    </p>

    {allergies.length > 0 && (
      <p>Alergias: {allergies.map((a) => a.substance).join(', ')}</p>
    )}
    {antecedents.length > 0 && (
      <p>Antecedentes: {antecedents.map((a) => a.description).join(', ')}</p>
    )}
    {returnAlert?.level && (
      <p>
        Alerta de retorno: {returnAlert.level === 'critical' ? `múltiplos retornos em ${RETURN_ALERT_CONFIG.criticalWindowHours}h` : `retorno em ${RETURN_ALERT_CONFIG.lightWindowDays} dias`}
      </p>
    )}

    {triage ? (
      <>
        <h2>Motivo da procura</h2>
        <p>Queixa principal: {triage.chiefComplaint}</p>
        {triage.complaintDetail.onsetAt && <p>Início da queixa: {new Date(triage.complaintDetail.onsetAt).toLocaleString('pt-BR')}{triage.complaintDetail.evolution ? ` — ${EVOLUTION_LABEL[triage.complaintDetail.evolution]}` : ''}</p>}
        <p>HDA: {triage.history ?? '—'}</p>

        <h2>Avaliação inicial</h2>
        <p>
          Estado geral: {triage.initialAssessment.generalCondition ? GENERAL_CONDITION_LABEL[triage.initialAssessment.generalCondition] : '—'} ·
          Consciência: {triage.initialAssessment.consciousness ? CONSCIOUSNESS_LABEL[triage.initialAssessment.consciousness] : '—'} ·
          Via aérea: {triage.initialAssessment.airway ? AIRWAY_LABEL[triage.initialAssessment.airway] : '—'} ·
          Respiração: {triage.initialAssessment.breathing ? BREATHING_LABEL[triage.initialAssessment.breathing] : '—'} ·
          Circulação: {triage.initialAssessment.circulation ? CIRCULATION_LABEL[triage.initialAssessment.circulation] : '—'}
        </p>
        {(triage.initialAssessment.skinFindings?.length ?? 0) > 0 && (
          <p>Pele: {(triage.initialAssessment.skinFindings ?? []).map((f) => SKIN_FINDING_LABEL[f]).join(', ')}</p>
        )}

        <h2>Sinais vitais</h2>
        <p>
          PA {triage.vitals.systolicBp ?? '—'}/{triage.vitals.diastolicBp ?? '—'} mmHg, FC {triage.vitals.heartRate ?? '—'} bpm,
          FR {triage.vitals.respiratoryRate ?? '—'} irpm, Temp. {triage.vitals.temperature ?? '—'}°C, SpO₂ {triage.vitals.oxygenSaturation ?? '—'}%
        </p>

        <h2>Avaliação da dor</h2>
        <p>
          Intensidade (0–10): {triage.painScore ?? '—'} · Localização: {triage.painDetail.location ?? '—'} · Irradiação: {triage.painDetail.irradiation ?? '—'} ·
          Característica: {triage.painDetail.character ?? '—'} · Evolução: {triage.painDetail.evolution ? EVOLUTION_LABEL[triage.painDetail.evolution] : '—'}
        </p>

        {triage.pregnancy.status && (
          <p>
            Gestação: {PREGNANCY_STATUS_LABEL[triage.pregnancy.status]}
            {triage.pregnancy.status === 'yes' && triage.pregnancy.weeks != null ? ` — ${triage.pregnancy.weeks} semanas` : ''}
          </p>
        )}

        {triage.notes && <p>Observações: {triage.notes}</p>}
        <h2>Classificação de risco</h2>
        <p>{activeLevel ? `${activeLevel.number} — ${activeLevel.label}` : '—'}</p>
        {triage.reclassifiedFrom && (
          <p>Reclassificado de: {triage.reclassifiedFrom} — Motivo: {triage.reclassificationReason}</p>
        )}
        <p>Profissional: {triage.performedBy} · Data/hora: {new Date(triage.performedAt).toLocaleString('pt-BR')}</p>

        <h2>Encaminhamento após triagem</h2>
        {triage.destination.type ? (
          <>
            <p>
              Tipo: {DESTINATION_TYPE_LABEL[triage.destination.type]}
              {' — '}Destino: {destinationEventLabel({ destinationType: triage.destination.type, roomId: triage.destination.roomId ?? null, examCategory: triage.destination.examCategory ?? null, procedureKind: triage.destination.procedureKind ?? null, procedureOther: triage.destination.procedureOther ?? null } as TriageDestinationEvent, rooms)}
            </p>
            <p>Data/hora: {triage.destination.setAt ? new Date(triage.destination.setAt).toLocaleString('pt-BR') : '—'}</p>
            {triage.destination.notes && <p>Observação: {triage.destination.notes}</p>}
          </>
        ) : (
          <p>Destino não definido.</p>
        )}
        {triage.destinationHistory.length > 1 && (
          <>
            <h2>Histórico de encaminhamentos</h2>
            {triage.destinationHistory.map((ev) => (
              <p key={ev.id}>
                {new Date(ev.setAt).toLocaleString('pt-BR')} — {DESTINATION_TYPE_LABEL[ev.destinationType]} — {destinationEventLabel(ev, rooms)}
                {ev.reason ? ` — Motivo: ${ev.reason}` : ' — Encaminhamento inicial'}
              </p>
            ))}
          </>
        )}
      </>
    ) : (
      <p>Triagem ainda não finalizada no momento da impressão.</p>
    )}

    {triage && triage.classificationHistory.length > 0 && (
      <>
        <h2>Histórico de classificações</h2>
        {triage.classificationHistory.map((ev) => (
          <p key={ev.id}>
            {new Date(ev.classifiedAt).toLocaleString('pt-BR')} — {MANCHESTER_LEVELS.find((l) => l.color === ev.riskColor)?.label ?? ev.riskColor}
            {' — '}{CLASSIFICATION_TYPE_LABEL[ev.classificationType]}
            {' — '}{resolveProfessionalLabel(ev.professionalName, ev.professionalId)}
            {ev.reason ? ` — ${ev.reason}` : ''}
          </p>
        ))}
      </>
    )}
  </div>
);

const CLASSIFICATION_TYPE_LABEL: Record<TriageClassificationEvent['classificationType'], string> = {
  initial: 'Classificação inicial',
  reclassification: 'Reclassificação',
};

/**
 * Espelha `resolveProfessionalLabel` de packages/domain/src/triage/rules.ts
 * (apps/web não depende de @vitaloop/domain — mesma convenção já usada em
 * encounter-flow.ts). Nome quando disponível (API já resolveu via JOIN
 * respeitando RLS); fallback por UUID truncado quando não — nunca quebra a
 * tela por falta de nome (Bloco 2.1, regra 3).
 */
const resolveProfessionalLabel = (professionalName: string | null | undefined, professionalId: string): string => {
  const trimmed = professionalName?.trim();
  return trimmed ? trimmed : `Profissional #${professionalId.slice(0, 8)}`;
};

/**
 * Timeline vertical, somente leitura, do histórico de classificação (Bloco
 * 2, regra 31 — "não colocar cada evento em uma coluna estreita... preferir
 * timeline vertical"). Mais recente primeiro (o mesmo evento do topo é a
 * classificação atual da triagem — `assertClassificationHistoryConsistent`
 * no backend garante essa correspondência).
 */
const ClassificationHistoryTimeline: React.FC<{ events: readonly TriageClassificationEvent[] }> = ({ events }) => (
  <ol className="flex flex-col gap-0">
    {events.map((ev, idx) => {
      const level = MANCHESTER_LEVELS.find((l) => l.color === ev.riskColor);
      const isLast = idx === events.length - 1;
      return (
        <li key={ev.id} className="relative flex gap-3 pb-4 pl-1">
          <div className="flex flex-col items-center">
            <span
              className="mt-1 flex size-3 shrink-0 rounded-full"
              style={{ backgroundColor: level?.bg ?? 'var(--color-border-strong)' }}
              aria-hidden="true"
            />
            {!isLast && <span className="w-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {level && (
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: level.bg, color: level.text }}
                >
                  {level.number}
                </span>
              )}
              <strong className="text-sm">{level?.label ?? ev.riskColor}</strong>
              {idx === 0 && <Badge variant="success">Atual</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(ev.classifiedAt).toLocaleString('pt-BR')} · {CLASSIFICATION_TYPE_LABEL[ev.classificationType]} · {resolveProfessionalLabel(ev.professionalName, ev.professionalId)}
            </div>
            {ev.reason && <p className="mt-1 text-sm">{ev.reason}</p>}
          </div>
        </li>
      );
    })}
  </ol>
);

const destinationEventLabel = (
  ev: TriageDestinationEvent,
  rooms: readonly { id: string; name: string }[],
): string => {
  if (ev.destinationType === 'medical_consultation') return rooms.find((r) => r.id === ev.roomId)?.name ?? 'Consultório';
  if (ev.destinationType === 'exam' && ev.examCategory) return EXAM_CATEGORY_LABEL[ev.examCategory];
  if (ev.destinationType === 'procedure' && ev.procedureKind) {
    return ev.procedureKind === 'other' && ev.procedureOther ? ev.procedureOther : PROCEDURE_KIND_LABEL[ev.procedureKind];
  }
  return '';
};

/** Timeline somente leitura do histórico de encaminhamento (Bloco 3) — mesmo padrão visual de `ClassificationHistoryTimeline`. */
const DestinationHistoryTimeline: React.FC<{ events: readonly TriageDestinationEvent[]; rooms: readonly { id: string; name: string }[] }> = ({ events, rooms }) => (
  <ol className="flex flex-col gap-0">
    {events.map((ev, idx) => {
      const isLast = idx === events.length - 1;
      const detail = destinationEventLabel(ev, rooms);
      return (
        <li key={ev.id} className="relative flex gap-3 pb-4 pl-1">
          <div className="flex flex-col items-center">
            <span className="mt-1 flex size-3 shrink-0 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} aria-hidden="true" />
            {!isLast && <span className="w-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{DESTINATION_TYPE_LABEL[ev.destinationType]}{detail ? ` — ${detail}` : ''}</strong>
              {idx === 0 && <Badge variant="success">Atual</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(ev.setAt).toLocaleString('pt-BR')} · {ev.reason ? 'Alteração' : 'Encaminhamento inicial'} · {resolveProfessionalLabel(ev.professionalName, ev.professionalId)}
            </div>
            {ev.reason && <p className="mt-1 text-sm">Motivo: {ev.reason}</p>}
          </div>
        </li>
      );
    })}
  </ol>
);
