import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { ManchesterRiskColor, Triage } from './types.js';

export const createTriageRecordedEvent = (triage: Triage, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'TriageRecorded',
    aggregateType: 'triage',
    aggregateId: triage.id as UUID,
    actorId,
    payload: {
      encounterId: triage.encounterId,
      patientId: triage.patientId,
      institutionId: triage.institutionId,
      unitId: triage.unitId,
      sectorId: triage.sectorId,
      chiefComplaint: triage.chiefComplaint,
      riskColor: triage.riskColor,
      priority: triage.priority,
      targetTimeMinutes: triage.targetTimeMinutes,
    },
  });

export const createPatientRiskClassifiedEvent = (triage: Triage, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'PatientRiskClassified',
    aggregateType: 'patient',
    aggregateId: triage.patientId as UUID,
    actorId,
    payload: {
      triageId: triage.id,
      encounterId: triage.encounterId,
      flowchart: triage.flowchart,
      discriminator: triage.discriminator,
      riskColor: triage.riskColor,
      priority: triage.priority,
      targetTimeMinutes: triage.targetTimeMinutes,
    },
  });

export const createRiskReclassifiedEvent = (
  triage: Triage,
  previousColor: ManchesterRiskColor,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'RiskReclassified',
    aggregateType: 'triage',
    aggregateId: triage.id as UUID,
    actorId,
    payload: {
      encounterId: triage.encounterId,
      patientId: triage.patientId,
      previousColor,
      newColor: triage.riskColor,
      reclassificationReason: triage.reclassificationReason,
      priority: triage.priority,
      targetTimeMinutes: triage.targetTimeMinutes,
    },
  });
