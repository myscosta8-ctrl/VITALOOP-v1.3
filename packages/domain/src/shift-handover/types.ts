/**
 * Passagem de Plantão Estruturada — Fase 5 do plano de reconstrução
 * assistencial, 12/09/2026. Diferente do SBAR (`app.sbar_updates`, que
 * cobre a transferência clínica de UM paciente entre setores), esta é a
 * passagem de plantão de SETOR/turno inteiro entre equipes (censo,
 * pendências, alertas críticos) — não existia nenhum registro disso.
 */
export type ShiftPeriod = 'manha' | 'tarde' | 'noite';

export interface ShiftHandover {
  readonly id: string;
  readonly sectorId?: string | null;
  readonly shiftPeriod: ShiftPeriod;
  readonly handoverDate: string;
  readonly outgoingProfessionalId: string;
  readonly incomingProfessionalId?: string | null;
  readonly patientCensus?: number | null;
  readonly criticalAlerts?: string | null;
  readonly pendingTasks?: string | null;
  readonly summaryNotes: string;
  readonly createdAt: string;
}

export interface ShiftHandoverCreateInput {
  readonly sectorId?: string | null;
  readonly shiftPeriod: ShiftPeriod;
  readonly handoverDate?: string | null;
  readonly incomingProfessionalId?: string | null;
  readonly patientCensus?: number | null;
  readonly criticalAlerts?: string | null;
  readonly pendingTasks?: string | null;
  readonly summaryNotes: string;
}
