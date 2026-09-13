import type { VitalSigns } from '../triage/types.js';

/**
 * Reavaliação de sinais vitais fora da Triagem (Fase 2 do plano de
 * reconstrução do módulo assistencial, 12/09/2026): hoje só a Triagem
 * grava sinais vitais — Consulta Médica e Enfermagem não tinham como
 * registrar uma nova aferição durante o atendimento. Este módulo é só a
 * lista cronológica de reaferições; a primeira aferição continua sendo a
 * da Triagem (`app.triages.vitals`), não duplicada aqui.
 */
export type VitalSignsSource = 'triagem' | 'consulta' | 'enfermagem';

export interface VitalSignsReading {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly source: VitalSignsSource;
  readonly vitals: VitalSigns;
  readonly notes?: string | null;
  readonly recordedBy: string;
  readonly createdAt: string;
}

export interface VitalSignsRecordInput {
  readonly encounterId: string;
  readonly patientId: string;
  readonly source: VitalSignsSource;
  readonly vitals: VitalSigns;
  readonly notes?: string | null;
}
