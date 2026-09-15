import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import { createEncountersApi, type Encounter, type PostConsultationDetail } from '../../../lib/encounters-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  encounter: Encounter | null;
  setEncounter: (e: Encounter) => void;
  reload: () => Promise<void>;
}

/**
 * Bloco 6 — "Conduta Pós-Consulta" não conclusiva: Observação, Exame e
 * Procedimento não são um desfecho (o atendimento continua ativo), então
 * NÃO usam `app.encounter_outcomes` (Desfecho — Bloco anterior, "Fase 3").
 * São exatamente o sub-estado que já existe desde antes deste bloco:
 * `encounter.status = 'post_consultation'` + `postConsultationDetail`
 * ('aguardando_exames_laboratoriais', 'aguardando_reavaliacao_medica' ou
 * 'medicando' — o mais próximo de "procedimento" sem inventar um valor
 * novo no enum). Reaproveita 100% a rota e o lock otimista
 * (`PATCH /api/v1/encounters/:id/status`, Bloco 2.1) — nenhum endpoint novo.
 *
 * A criação da SOLICITAÇÃO de exame/procedimento em si (ExamRequest/
 * ProcedureRequest) já é feita pela aba "Exames" (useExamsAndProcedures) —
 * este hook só marca o atendimento como "aguardando" aquilo.
 */
export const useInterimDecision = (api: ApiClient, encounterId: string, deps: Deps) => {
  const encountersApi = createEncountersApi(api);
  const { encounter, setEncounter, reload } = deps;
  const [submitting, setSubmitting] = useState<PostConsultationDetail | null>(null);

  const handleSetInterimDecision = async (detail: PostConsultationDetail) => {
    if (!encounter) return;
    setSubmitting(detail);
    try {
      const updated = await encountersApi.updateStatus(encounterId, {
        status: 'post_consultation',
        postConsultationDetail: detail,
        expectedUpdatedAt: encounter.updatedAt,
      });
      setEncounter(updated);
      toast.success('Conduta registrada: atendimento segue em acompanhamento.');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Este atendimento foi alterado por outro profissional. Atualize o atendimento antes de continuar.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar conduta.');
      }
    } finally {
      setSubmitting(null);
    }
  };

  return { submitting, handleSetInterimDecision };
};

export type InterimDecisionForm = ReturnType<typeof useInterimDecision>;
