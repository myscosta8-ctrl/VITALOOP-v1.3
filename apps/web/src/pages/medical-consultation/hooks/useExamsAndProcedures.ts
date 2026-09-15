import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import { createExamsApi, type ExamCatalogItem, type InterconsultationPriority } from '../../../lib/exams-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  reload: () => Promise<void>;
}

/** Aba "Exames" — exames laboratoriais/imagem, procedimentos ambulatoriais e interconsultas. */
export const useExamsAndProcedures = (api: ApiClient, encounterId: string, deps: Deps) => {
  const examsApi = createExamsApi(api);
  const { reload } = deps;

  const [selectedExamItem, setSelectedExamItem] = useState<ExamCatalogItem | null>(null);
  const [examClinicalIndication, setExamClinicalIndication] = useState('');
  const [recordingResultExamId, setRecordingResultExamId] = useState<string | null>(null);
  const [examResultSummary, setExamResultSummary] = useState('');

  const [procedureNameInput, setProcedureNameInput] = useState('');
  const [procedureInstructionsInput, setProcedureInstructionsInput] = useState('');
  const [executingProcedureId, setExecutingProcedureId] = useState<string | null>(null);
  const [procedureExecutionNotes, setProcedureExecutionNotes] = useState('');

  const [interSpecialty, setInterSpecialty] = useState('Cardiologia');
  const [interPriority, setInterPriority] = useState<InterconsultationPriority>('routine');
  const [interClinicalSummary, setInterClinicalSummary] = useState('');
  const [interQuestion, setInterQuestion] = useState('');
  const [respondingInterId, setRespondingInterId] = useState<string | null>(null);
  const [interResponseNotes, setInterResponseNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handleCreateExamRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamItem) { toast.error('Selecione um exame no catálogo.'); return; }
    if (!examClinicalIndication.trim() || examClinicalIndication.trim().length < 5) {
      toast.error('Informe uma indicação clínica detalhada para o exame (mínimo 5 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      await examsApi.createExamRequest(encounterId, {
        examId: selectedExamItem.id,
        examName: selectedExamItem.name,
        examType: selectedExamItem.type,
        clinicalIndication: examClinicalIndication.trim(),
      });

      setSelectedExamItem(null);
      setExamClinicalIndication('');
      toast.success('Exame solicitado com sucesso!');
      await reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar exame.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Bloco 7 (Fase 3) — "coletar/realizar" é um passo distinto de "lançar
  // resultado": não marca o exame como concluído nem inventa um resultado,
  // só reaproveita o status 'collected' que já existia no enum.
  const handleCollectExam = async (examRequestId: string, expectedUpdatedAt: string) => {
    setSubmitting(true);
    try {
      await examsApi.collectExam(encounterId, examRequestId, { expectedUpdatedAt });
      toast.success('Coleta/realização do exame registrada.');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Este exame foi alterado por outro profissional. Atualize os dados antes de continuar.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar coleta do exame.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExamResult = async (examRequestId: string, expectedUpdatedAt: string) => {
    if (!examResultSummary.trim()) { toast.error('Informe o resultado/laudo do exame.'); return; }

    setSubmitting(true);
    try {
      await examsApi.recordExamResult(encounterId, examRequestId, {
        resultSummary: examResultSummary.trim(),
        expectedUpdatedAt,
      });

      setRecordingResultExamId(null);
      setExamResultSummary('');
      toast.success('Resultado do exame lançado com sucesso!');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Este exame foi alterado por outro profissional. Atualize os dados antes de continuar.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao lançar resultado do exame.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProcedureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedureNameInput.trim()) { toast.error('Informe o nome do procedimento ambulatorial.'); return; }

    setSubmitting(true);
    try {
      await examsApi.createProcedureRequest(encounterId, {
        procedureName: procedureNameInput.trim(),
        instructions: procedureInstructionsInput.trim() || null,
      });

      setProcedureNameInput('');
      setProcedureInstructionsInput('');
      toast.success('Procedimento solicitado com sucesso!');
      await reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar procedimento.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Bloco 7 (Fase 3) — "iniciar" é opcional (nursing/executor sinaliza que
  // começou); "executar" continua podendo ser chamado direto de 'requested'
  // (compatibilidade com o fluxo de 1 clique já existente).
  const handleStartProcedure = async (procedureRequestId: string, expectedUpdatedAt: string) => {
    setSubmitting(true);
    try {
      await examsApi.startProcedure(encounterId, procedureRequestId, { expectedUpdatedAt });
      toast.success('Execução do procedimento iniciada.');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Este procedimento foi alterado por outro profissional. Atualize os dados antes de continuar.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao iniciar execução do procedimento.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteProcedure = async (procedureRequestId: string, expectedUpdatedAt: string) => {
    setSubmitting(true);
    try {
      await examsApi.executeProcedure(encounterId, procedureRequestId, {
        notes: procedureExecutionNotes.trim() || 'Executado com sucesso',
        expectedUpdatedAt,
      });
      setExecutingProcedureId(null);
      setProcedureExecutionNotes('');
      toast.success('Procedimento marcado como executado/concluído!');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Este procedimento foi alterado por outro profissional. Atualize os dados antes de continuar.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao concluir procedimento.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInterconsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interClinicalSummary.trim()) { toast.error('Informe o resumo clínico do caso para a interconsulta.'); return; }
    if (!interQuestion.trim()) { toast.error('Informe a dúvida/quesito técnico para a interconsulta.'); return; }

    setSubmitting(true);
    try {
      await examsApi.createInterconsultation(encounterId, {
        specialty: interSpecialty,
        priority: interPriority,
        clinicalSummary: interClinicalSummary.trim(),
        question: interQuestion.trim(),
      });

      setInterClinicalSummary('');
      setInterQuestion('');
      toast.success('Solicitação de parecer de interconsulta enviada com sucesso!');
      await reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar interconsulta.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondInterconsultation = async (interconsultationId: string) => {
    if (!interResponseNotes.trim() || interResponseNotes.trim().length < 10) {
      toast.error('Informe o parecer técnico completo do especialista (mínimo 10 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      await examsApi.respondInterconsultation(encounterId, interconsultationId, {
        responseNotes: interResponseNotes.trim(),
      });

      setRespondingInterId(null);
      setInterResponseNotes('');
      toast.success('Parecer de interconsulta médica registrado com sucesso!');
      await reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao responder interconsulta.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedExamItem, setSelectedExamItem,
    examClinicalIndication, setExamClinicalIndication,
    recordingResultExamId, setRecordingResultExamId,
    examResultSummary, setExamResultSummary,
    procedureNameInput, setProcedureNameInput,
    procedureInstructionsInput, setProcedureInstructionsInput,
    executingProcedureId, setExecutingProcedureId,
    procedureExecutionNotes, setProcedureExecutionNotes,
    interSpecialty, setInterSpecialty,
    interPriority, setInterPriority,
    interClinicalSummary, setInterClinicalSummary,
    interQuestion, setInterQuestion,
    respondingInterId, setRespondingInterId,
    interResponseNotes, setInterResponseNotes,
    submitting,
    handleCreateExamRequest,
    handleCollectExam,
    handleRecordExamResult,
    handleCreateProcedureRequest,
    handleStartProcedure,
    handleExecuteProcedure,
    handleCreateInterconsultation,
    handleRespondInterconsultation,
  };
};

export type ExamsAndProceduresForm = ReturnType<typeof useExamsAndProcedures>;
