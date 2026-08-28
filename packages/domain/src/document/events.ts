import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { ClinicalDocumentType } from './types.js';

export function createClinicalDocumentIssuedEvent(
  documentId: UUID,
  encounterId: UUID,
  patientId: UUID,
  issuerId: UUID,
  documentType: ClinicalDocumentType,
  title: string,
  integrityHash: string,
): DomainEvent {
  return createDomainEvent({
    type: 'ClinicalDocumentIssued',
    aggregateType: 'clinical_document',
    aggregateId: documentId,
    actorId: issuerId,
    payload: {
      documentId,
      encounterId,
      patientId,
      issuerId,
      documentType,
      title,
      integrityHash,
    },
  });
}

export function createClinicalDocumentRevokedEvent(
  documentId: UUID,
  encounterId: UUID,
  patientId: UUID,
  revokedBy: UUID,
  revocationReason: string,
): DomainEvent {
  return createDomainEvent({
    type: 'ClinicalDocumentRevoked',
    aggregateType: 'clinical_document',
    aggregateId: documentId,
    actorId: revokedBy,
    payload: {
      documentId,
      encounterId,
      patientId,
      revokedBy,
      revocationReason,
    },
  });
}
