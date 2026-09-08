import type { ApiClient } from './api-client.js';

export interface CreateRegulationPayload {
  encounterId: string;
  patientId: string;
  aihRequestId?: string | undefined;
  destinationFacility: string;
  specialty: string;
  priority?: 'low' | 'medium' | 'high' | 'emergency' | undefined;
  transportType?: 'basic_ambulance' | 'uti_mobile' | 'samu' | 'own_means' | undefined;
  documents?: Array<{
    documentType: 'clinical_report' | 'exam_result' | 'aih_form';
    documentId?: string | undefined;
    notes?: string | undefined;
  }> | undefined;
}

export interface RegulationRequest {
  id: string;
  status: string;
}

export const createRegulationApi = (api: ApiClient) => ({
  createExternalRegulation: (payload: CreateRegulationPayload): Promise<RegulationRequest> =>
    api.post<RegulationRequest>('/api/v1/regulation/requests', payload),

  fetchRegulationRequests: (): Promise<RegulationRequest[]> => api.get<RegulationRequest[]>('/api/v1/regulation/requests'),

  updateRegulationStatus: (id: string, targetStatus: string, cancellationReason?: string): Promise<RegulationRequest> =>
    api.patch<RegulationRequest>(`/api/v1/regulation/requests/${id}/status`, { targetStatus, cancellationReason }),

  // Endpoint mora em /api/v1/sus/... (mesma família de rotas do AIH), não em
  // /api/v1/regulation/... — nome mantido aqui porque é chamado só no fluxo
  // de confirmação de transferência (ExternalRegulationModal).
  closeAihRequest: (id: string): Promise<{ id: string; closedAt: string }> =>
    api.post<{ id: string; closedAt: string }>(`/api/v1/sus/aih-requests/${id}/close`),
});
