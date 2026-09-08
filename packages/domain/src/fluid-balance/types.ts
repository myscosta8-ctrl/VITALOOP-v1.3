import type { UUID } from '@vitaloop/shared';

// Balanço Hídrico — reescrito em 2026-09-07 a partir do modelo real do
// Hospital Regional Público do Marajó (PDF + telas do sistema SALUTEM
// fornecidos pelo usuário na pasta DOC/, extraídos e depois apagados —
// continham dado de paciente real). Substitui a implementação anterior
// (NUR-009, `app.fluid_balance_records` — mantida no banco por
// compatibilidade histórica, mas não é mais escrita pela aplicação).
//
// Diferenças confirmadas contra o modelo real que a versão anterior não
// tinha: cada balanço é um PERÍODO numerado (não um lançamento solto) com
// status (aberto/fechado parcial/fechado) e data de referência; cada
// lançamento tem item por NOME LIVRE (não uma lista fechada de tipos de
// fluido), horário (hora, não só timestamp), e região/lateralidade
// opcionais (relevantes pra débito de dreno/ferida). Layout de papel (grade
// hora-a-hora) não é reproduzido pixel a pixel — só a informação que ele
// carrega, conforme instrução já validada pelo usuário em outras telas.
export type FluidBalanceStatus = 'open' | 'partially_closed' | 'closed';
export type FluidBalanceDirection = 'gain' | 'loss';

export interface FluidBalancePeriod {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  balanceNumber: number;
  status: FluidBalanceStatus;
  referenceDate: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd?: string | null;
  createdBy: UUID;
  closedBy?: UUID | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidBalanceEntry {
  id: UUID;
  periodId: UUID;
  direction: FluidBalanceDirection;
  itemName: string;
  volumeMl: number;
  entryDate: string; // YYYY-MM-DD
  entryHour: number; // 0-23
  entryMinute: number; // 0-59
  region?: string | null;
  laterality?: 'left' | 'right' | 'bilateral' | null;
  recordedBy: UUID;
  createdAt: string;
}

export interface FluidBalanceTotals {
  totalGainMl: number;
  totalLossMl: number;
  netBalanceMl: number;
}

export interface CreateFluidBalancePeriodInput {
  encounterId: UUID;
  patientId: UUID;
  referenceDate: string;
}

export interface CreateFluidBalanceEntryInput {
  periodId: UUID;
  direction: FluidBalanceDirection;
  itemName: string;
  volumeMl: number;
  entryDate: string;
  entryHour: number;
  entryMinute?: number | undefined;
  region?: string | null | undefined;
  laterality?: 'left' | 'right' | 'bilateral' | null | undefined;
}

export interface CloseFluidBalancePeriodInput {
  periodId: UUID;
  currentStatus: FluidBalanceStatus;
  targetStatus: Extract<FluidBalanceStatus, 'partially_closed' | 'closed'>;
}
