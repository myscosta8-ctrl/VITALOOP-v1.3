import type { ApiClient } from './api-client.js';
import type { ClinicalFormSchema } from './clinical-form-types.js';

export interface NotifiableDisease {
  id: string;
  code: string;
  name: string;
}

export interface CompulsoryNotification {
  id: string;
  diseaseId: string;
  diseaseName: string;
  patientId: string;
  patientName: string;
  encounterId?: string | null;
  notifiedBy: string;
  notifiedByName: string;
  symptomOnsetDate?: string | null;
  clinicalNotes?: string | null;
  bodyFields?: Record<string, string> | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  diseaseId: string;
  patientId: string;
  encounterId?: string | null;
  symptomOnsetDate?: string | null;
  clinicalNotes?: string | null;
  bodyFields?: Record<string, string> | null;
}

export const createNotificationApi = (api: ApiClient) => ({
  listDiseases: async (): Promise<NotifiableDisease[]> =>
    api.get<NotifiableDisease[]>('/api/v1/notifiable-diseases'),

  listNotifications: async (): Promise<CompulsoryNotification[]> =>
    api.get<CompulsoryNotification[]>('/api/v1/compulsory-notifications'),

  // `null` quando a doença ainda não tem campos clínicos mapeados — a tela
  // mostra só o campo de observação livre nesse caso.
  getBodySchema: async (diseaseCode: string): Promise<ClinicalFormSchema | null> =>
    api.get<ClinicalFormSchema | null>(`/api/v1/notifiable-diseases/${encodeURIComponent(diseaseCode)}/body-schema`),

  createNotification: async (input: CreateNotificationInput): Promise<CompulsoryNotification> =>
    api.post<CompulsoryNotification>('/api/v1/compulsory-notifications', input),
});
