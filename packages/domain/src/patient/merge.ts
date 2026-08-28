/**
 * Fluxo de solicitação/revisão de merge de paciente (PAT-016) — reaproveita
 * a máquina de estados genérica (`../state-machine.ts`), conforme já
 * recomendado em `docs/PHASE_2_READINESS.md §5` ("sem reinventar um motor
 * de estados próprio").
 *
 * Transições cobertas: `requested -> approved`, `requested -> rejected`.
 * A migration 0017 já registra `executed` no enum `merge_request_status`,
 * mas a EXECUÇÃO do merge (reatribuição de dados clínicos entre pacientes)
 * está explicitamente NÃO DEFINIDA (Doc 1/2/3/4 não especificam regras
 * suficientes) — por isso NÃO existe uma transição `APPROVE_TO_EXECUTE`
 * exposta aqui. Qualquer tentativa de acionar isso deve usar
 * `mergeExecutionNotDefinedError()` (`errors.ts`), nunca inventar a lógica.
 */

import { defineStateMachine } from '../state-machine.js';
import type { MergeRequestStatus } from './types.js';

type MergeEvent = 'APPROVE' | 'REJECT';

export const mergeRequestStateMachine = defineStateMachine<MergeRequestStatus, MergeEvent>({
  name: 'patient_merge_request',
  initial: 'requested',
  states: ['requested', 'approved', 'rejected', 'executed'],
  events: ['APPROVE', 'REJECT'],
  transitions: {
    requested: { APPROVE: 'approved', REJECT: 'rejected' },
    // 'approved' e 'rejected' são estados terminais para este domínio —
    // a transição para 'executed' fica deliberadamente NÃO declarada.
  },
});
