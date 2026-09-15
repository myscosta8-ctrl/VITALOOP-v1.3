import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  ExamRequestInput,
  ExamResultInput,
  ExamStatus,
  InterconsultationInput,
  InterconsultationResponseInput,
  ProcedureExecuteInput,
  ProcedureRequestInput,
  ProcedureStatus,
} from './types.js';

export const validateExamRequestInput = (input: ExamRequestInput): ExamRequestInput => {
  // Bloco 7.2 — consultationId é opcional: nulo quando a solicitação nasce
  // diretamente do encaminhamento da Triagem (destination.type='exam'),
  // exceção expressamente permitida — atendimento e paciente continuam
  // sempre obrigatórios.
  if (!input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EXAM_MISSING_REQUIRED_IDS',
      message: 'Atendimento e Paciente são obrigatórios para a solicitação de exame.',
    });
  }

  const examName = (input.examName || '').trim();
  if (!examName) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EXAM_NAME_REQUIRED',
      message: 'O nome do exame é obrigatório.',
    });
  }

  const clinicalIndication = (input.clinicalIndication || '').trim();
  if (!clinicalIndication || clinicalIndication.length < 5) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EXAM_CLINICAL_INDICATION_REQUIRED',
      message: 'Informe uma indicação clínica detalhada para o exame (mínimo 5 caracteres).',
    });
  }

  return {
    ...input,
    examName,
    examType: input.examType || 'laboratory',
    clinicalIndication,
  };
};

export const validateExamResultInput = (input: ExamResultInput): ExamResultInput => {
  if (!input.examRequestId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EXAM_MISSING_ID',
      message: 'ID da solicitação de exame é obrigatório.',
    });
  }

  const resultSummary = (input.resultSummary || '').trim();
  if (!resultSummary) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EXAM_RESULT_SUMMARY_REQUIRED',
      message: 'O resumo/laudo do resultado do exame é obrigatório.',
    });
  }

  return {
    examRequestId: input.examRequestId,
    resultSummary,
    resultNotes: input.resultNotes ? input.resultNotes.trim() : null,
  };
};

export const validateProcedureRequestInput = (input: ProcedureRequestInput): ProcedureRequestInput => {
  // Bloco 7.2 — mesma exceção do exame: consultationId nulo quando a
  // solicitação nasce do encaminhamento direto da Triagem
  // (destination.type='procedure').
  if (!input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PROCEDURE_MISSING_REQUIRED_IDS',
      message: 'Atendimento e Paciente são obrigatórios para o procedimento.',
    });
  }

  const procedureName = (input.procedureName || '').trim();
  if (!procedureName) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PROCEDURE_NAME_REQUIRED',
      message: 'O nome do procedimento ambulatorial é obrigatório.',
    });
  }

  return {
    ...input,
    procedureName,
    instructions: input.instructions ? input.instructions.trim() : null,
  };
};

export const validateProcedureExecuteInput = (input: ProcedureExecuteInput): ProcedureExecuteInput => {
  if (!input.procedureRequestId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PROCEDURE_MISSING_ID',
      message: 'ID da solicitação de procedimento é obrigatório.',
    });
  }

  return {
    procedureRequestId: input.procedureRequestId,
    notes: input.notes ? input.notes.trim() : null,
  };
};

export const validateInterconsultationInput = (input: InterconsultationInput): InterconsultationInput => {
  if (!input.consultationId || !input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_MISSING_REQUIRED_IDS',
      message: 'Consulta, Atendimento e Paciente são obrigatórios para a interconsulta.',
    });
  }

  const specialty = (input.specialty || '').trim();
  if (!specialty) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_SPECIALTY_REQUIRED',
      message: 'A especialidade médica para a interconsulta é obrigatória.',
    });
  }

  const clinicalSummary = (input.clinicalSummary || '').trim();
  if (!clinicalSummary) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_CLINICAL_SUMMARY_REQUIRED',
      message: 'O resumo clínico do caso é obrigatório para a interconsulta.',
    });
  }

  const question = (input.question || '').trim();
  if (!question) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_QUESTION_REQUIRED',
      message: 'A dúvida/quesito para o parecer do especialista é obrigatório.',
    });
  }

  return {
    ...input,
    specialty,
    priority: input.priority || 'routine',
    clinicalSummary,
    question,
  };
};

// =====================================================================
// Bloco 7 — separação solicitação x execução (Fase 3/9/12). Regras puras de
// transição de status: nenhuma delas toca banco. `ExamStatus`/`ProcedureStatus`
// já tinham 'collected'/'in_analysis' e 'in_progress' definidos desde a
// migration 0030 mas nunca usados em nenhuma rota — reaproveitados aqui, sem
// nenhuma migration nova.
// =====================================================================

/** Só é possível registrar a coleta de um exame ainda 'requested' (Fase 3). */
export const assertExamStatusAllowsCollection = (status: ExamStatus): void => {
  if (status !== 'requested') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'EXAM_INVALID_STATUS_FOR_COLLECTION',
      message: `Não é possível registrar a coleta: o exame está em status '${status}', não 'requested'.`,
    });
  }
};

/** O resultado só pode ser lançado enquanto o exame não foi concluído/cancelado (Fase 9: execução duplicada rejeitada). */
export const assertExamStatusAllowsResult = (status: ExamStatus): void => {
  if (status !== 'requested' && status !== 'collected' && status !== 'in_analysis') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'EXAM_INVALID_STATUS_FOR_RESULT',
      message: `Não é possível lançar resultado: o exame já está em status '${status}'.`,
    });
  }
};

/** Só é possível iniciar a execução de um procedimento ainda 'requested' (Fase 3). */
export const assertProcedureStatusAllowsStart = (status: ProcedureStatus): void => {
  if (status !== 'requested') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'PROCEDURE_INVALID_STATUS_FOR_START',
      message: `Não é possível iniciar a execução: o procedimento está em status '${status}', não 'requested'.`,
    });
  }
};

/** A execução só pode ocorrer enquanto o procedimento não foi concluído/cancelado (Fase 9: execução duplicada rejeitada). */
export const assertProcedureStatusAllowsExecution = (status: ProcedureStatus): void => {
  if (status !== 'requested' && status !== 'in_progress') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'PROCEDURE_INVALID_STATUS_FOR_EXECUTION',
      message: `Não é possível executar: o procedimento já está em status '${status}'.`,
    });
  }
};

export const validateInterconsultationResponseInput = (
  input: InterconsultationResponseInput,
): InterconsultationResponseInput => {
  if (!input.interconsultationId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_MISSING_ID',
      message: 'ID da interconsulta é obrigatório.',
    });
  }

  const responseNotes = (input.responseNotes || '').trim();
  if (!responseNotes || responseNotes.length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INTERCONSULTATION_RESPONSE_REQUIRED',
      message: 'Informe o parecer técnico completo do especialista (mínimo 10 caracteres).',
    });
  }

  return {
    interconsultationId: input.interconsultationId,
    responseNotes,
  };
};
