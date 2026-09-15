import type { ManchesterRiskColor } from '../triage/types.js';

// 'red_room' (Bloco 5): fila operacional da Sala Vermelha, roteada a partir
// do encaminhamento da Triagem (destination.type === 'red_room') — nunca
// derivada da cor Manchester (continuam independentes).
export type QueueType = 'reception' | 'triage' | 'medical' | 'reevaluation' | 'red_room';
export type TicketStatus = 'waiting' | 'called' | 'in_service' | 'absent' | 'finished' | 'canceled';

export interface Queue {
  id: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;
  name: string;
  queueType: QueueType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueTicket {
  id: string;
  queueId: string;
  encounterId: string;
  patientId: string;
  ticketNumber: string;
  priorityScore: number;
  riskColor?: ManchesterRiskColor | null;
  callRoom?: string | null;
  // Bloco 5 — consultório vinculado ao ticket quando o encaminhamento da
  // Triagem for "medical_consultation" (migration 0094). NULL nos demais.
  consultationRoomId?: string | null;
  status: TicketStatus;
  callCount: number;
  calledAt?: string | null;
  calledBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueCreateInput {
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;
  name: string;
  queueType: QueueType;
}

export interface TicketEnqueueInput {
  queueId: string;
  encounterId: string;
  patientId: string;
  ticketNumber?: string | null;
  riskColor?: ManchesterRiskColor | null;
}

export interface TicketCallInput {
  ticketId: string;
  callRoom: string;
  calledByUserId: string;
}

export interface TicketStatusUpdateInput {
  ticketId: string;
  status: TicketStatus;
  notes?: string | null;
}
