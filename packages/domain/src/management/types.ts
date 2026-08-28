import type { UUID } from '@vitaloop/shared';

export interface OperationalSummary {
  activeEncountersCount: number;
  triagePendingCount: number;
  consultationPendingCount: number;
  occupiedBedsCount: number;
  totalBedsCount: number;
  bedOccupancyRate: number;
}

export interface ManagementAlert {
  id: UUID;
  alertType: 'queue_overcrowded' | 'beds_full' | 'wait_time_exceeded' | 'tmp_exceeded';
  severity: 'warning' | 'critical';
  message: string;
  metricValue?: number | null;
  thresholdValue?: number | null;
  isAcknowledged: boolean;
  acknowledgedBy?: UUID | null;
  createdAt: string;
}

export interface ManchesterWaitTimeKpi {
  riskCategory: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
  targetMinutes: number;
  averageWaitMinutes: number;
  isWithinTarget: boolean;
}

export interface TeamProductivityMetric {
  professionalId: UUID;
  professionalName: string;
  role: 'doctor' | 'nurse';
  totalServicesPerformed: number;
}

export interface ManagementDashboardData {
  summary: OperationalSummary;
  riskDistribution: Record<string, number>;
  averageTmpHours: number;
  alerts: ManagementAlert[];
  manchesterKpis: ManchesterWaitTimeKpi[];
}
