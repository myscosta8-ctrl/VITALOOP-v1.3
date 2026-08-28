import type { ApiClient } from './api-client.js';

export type QueueType = 'reception' | 'triage' | 'medical' | 'reevaluation';
export type TicketStatus = 'waiting' | 'called' | 'in_service' | 'absent' | 'finished' | 'canceled';
export type ManchesterRiskColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';

export interface Queue {
  readonly id: string;
  readonly institutionId: string;
  readonly unitId?: string | null;
  readonly sectorId?: string | null;
  readonly name: string;
  readonly queueType: QueueType;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QueueTicket {
  readonly id: string;
  readonly queueId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly ticketNumber: string;
  readonly priorityScore: number;
  readonly riskColor?: ManchesterRiskColor | null;
  readonly callRoom?: string | null;
  readonly status: TicketStatus;
  readonly callCount: number;
  readonly calledAt?: string | null;
  readonly calledBy?: string | null;
  readonly notes?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isExceeded?: boolean;
}

export interface TicketEnqueuePayload {
  encounterId: string;
  ticketNumber?: string | null;
}

export interface TicketCallPayload {
  callRoom: string;
}

export interface TicketUpdateStatusPayload {
  status: TicketStatus;
  notes?: string | null;
}

export const createQueuesApi = (api: ApiClient) => ({
  listQueues: () => api.get<readonly Queue[]>('/api/v1/queues'),

  listTickets: (queueId: string) =>
    api.get<readonly QueueTicket[]>(`/api/v1/queues/${queueId}/tickets`),

  enqueueEncounter: (queueId: string, payload: TicketEnqueuePayload) =>
    api.post<QueueTicket>(`/api/v1/queues/${queueId}/enqueue`, payload),

  callTicket: (ticketId: string, payload: TicketCallPayload) =>
    api.post<QueueTicket>(`/api/v1/queues/tickets/${ticketId}/call`, payload),

  recallTicket: (ticketId: string) =>
    api.post<QueueTicket>(`/api/v1/queues/tickets/${ticketId}/recall`),

  updateStatus: (ticketId: string, payload: TicketUpdateStatusPayload) =>
    api.patch<QueueTicket>(`/api/v1/queues/tickets/${ticketId}/status`, payload),
});

export type QueuesApi = ReturnType<typeof createQueuesApi>;
