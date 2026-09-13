/**
 * Rastreio especial de medicamentos controlados (Portaria SVS/MS nº 344/98)
 * — Fase 5 do plano de reconstrução assistencial, 12/09/2026. Hoje um
 * medicamento controlado (ex.: Tramadol, Lista A1) é só mais um item de
 * prescrição comum, sem o rastreio que a legislação exige (número da
 * notificação de receita para listas A/B, testemunha, quantidade exata
 * dispensada).
 */
export type ControlledMedicationClass =
  | 'A1' | 'A2' | 'A3' // entorpecentes
  | 'B1' | 'B2'        // psicotrópicos
  | 'C1'                // outras substâncias sujeitas a controle especial
  | 'C2'                // retinóicos
  | 'C3'                // imunossupressores
  | 'C4'                // anti-retrovirais
  | 'C5';               // anabolizantes

export interface ControlledMedicationDispensation {
  readonly id: string;
  readonly prescriptionItemId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly controlledClass: ControlledMedicationClass;
  readonly quantityDispensed: number;
  readonly unit: string;
  readonly prescriptionNotificationNumber?: string | null;
  readonly dispensedBy: string;
  readonly witnessName?: string | null;
  readonly notes?: string | null;
  readonly dispensedAt: string;
}

export interface ControlledMedicationDispensationInput {
  readonly prescriptionItemId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly controlledClass: ControlledMedicationClass;
  readonly quantityDispensed: number;
  readonly unit: string;
  readonly prescriptionNotificationNumber?: string | null;
  readonly witnessName?: string | null;
  readonly notes?: string | null;
}
