import type { ApiClient } from './api-client.js';

export interface NursingRecordData {
  id: string;
  encounterId: string;
  patientId: string;
  professionalId: string;
  recordType: 'admission' | 'evolution' | 'annotation';
  content: string;
  vitalSigns?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationScheduleData {
  id: string;
  prescriptionId: string;
  prescriptionItemId: string;
  encounterId: string;
  patientId: string;
  medicationName: string;
  dose: number;
  doseUnit: string;
  route: string;
  frequency: string;
  scheduledTime: string;
  status: 'pending' | 'administered' | 'not_administered' | 'refused' | 'suspended' | 'canceled';
  scheduledBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationAdministrationData {
  id: string;
  scheduleId: string;
  encounterId: string;
  patientId: string;
  executorId: string;
  status: 'administered' | 'not_administered' | 'refused' | 'suspended';
  administeredAt: string;
  notes?: string | null;
  nonAdminReason?: string | null;
  bedSideChecked: boolean;
  batchNumber?: string | null;
  createdAt: string;
}

export interface AdministerMedicationPayload {
  status: 'administered' | 'not_administered' | 'refused' | 'suspended';
  notes?: string | null;
  nonAdminReason?: string | null;
  bedSideChecked?: boolean;
  batchNumber?: string | null;
}

export const createNursingApi = (api: ApiClient) => ({
  createNursingRecord: (
    encounterId: string,
    payload: { recordType: 'admission' | 'evolution' | 'annotation'; content: string; vitalSigns?: Record<string, unknown> | null },
  ) => api.post<NursingRecordData>(`/api/v1/encounters/${encounterId}/nursing/records`, payload),

  getNursingRecords: (encounterId: string) =>
    api.get<NursingRecordData[]>(`/api/v1/encounters/${encounterId}/nursing/records`),

  schedulePrescription: (encounterId: string, prescriptionId: string, scheduledTimes?: string[]) =>
    api.post<MedicationScheduleData[]>(
      `/api/v1/encounters/${encounterId}/prescriptions/${prescriptionId}/schedule`,
      { scheduledTimes },
    ),

  getMedicationSchedules: (encounterId: string) =>
    api.get<MedicationScheduleData[]>(`/api/v1/encounters/${encounterId}/medication-schedules`),

  administerMedication: (scheduleId: string, payload: AdministerMedicationPayload) =>
    api.post<MedicationAdministrationData>(`/api/v1/medication-schedules/${scheduleId}/administer`, payload),
});

export type NursingApi = ReturnType<typeof createNursingApi>;
