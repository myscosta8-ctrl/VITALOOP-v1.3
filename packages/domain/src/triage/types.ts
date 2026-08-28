/**
 * Tipos e contratos de domínio para Triagem e Classificação de Risco (TRI-001..017).
 */

export type ManchesterRiskColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export type ManchesterPriority = 'emergency' | 'very_urgent' | 'urgent' | 'standard' | 'non_urgent';

export interface VitalSigns {
  systolicBp?: number | null;     // mmHg (ex.: 120)
  diastolicBp?: number | null;    // mmHg (ex.: 80)
  heartRate?: number | null;      // bpm (ex.: 75)
  respiratoryRate?: number | null;// ipm (ex.: 16)
  temperature?: number | null;    // ºC (ex.: 36.5)
  oxygenSaturation?: number | null;// % (ex.: 98)
}

export interface Triage {
  id: string;
  encounterId: string;
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;

  chiefComplaint: string;
  symptomsDuration?: string | null;
  history?: string | null;

  vitals: VitalSigns;
  painScore?: number | null;
  glasgowScore?: number | null;
  capillaryGlucose?: number | null;

  flowchart?: string | null;
  discriminator?: string | null;
  riskColor: ManchesterRiskColor;
  priority: ManchesterPriority;
  targetTimeMinutes: number;
  protocolVersion: string;

  reclassificationReason?: string | null;
  reclassifiedFrom?: string | null;
  notes?: string | null;
  performedBy: string;
  performedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriageCreateInput {
  encounterId: string;
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;

  chiefComplaint: string;
  symptomsDuration?: string | null;
  history?: string | null;

  vitals?: VitalSigns | null;
  painScore?: number | null;
  glasgowScore?: number | null;
  capillaryGlucose?: number | null;

  flowchart?: string | null;
  discriminator?: string | null;
  riskColor: ManchesterRiskColor;
  notes?: string | null;
}

export interface TriageReclassifyInput {
  triageId: string;
  newRiskColor: ManchesterRiskColor;
  reclassificationReason: string;
  notes?: string | null;
}
