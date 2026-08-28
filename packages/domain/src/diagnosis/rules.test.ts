import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createPatientDiagnosisRecordedEvent,
  createPatientDiagnosisUpdatedEvent,
} from './events.js';
import {
  validateDiagnosisCreateInput,
  validateDiagnosisStatusUpdate,
} from './rules.js';
import type { EncounterDiagnosis } from './types.js';

describe('Diagnosis Domain Rules & Events', () => {
  describe('validateDiagnosisCreateInput', () => {
    it('valida diagnostico principal valido com CID-10 em maiusculas', () => {
      const result = validateDiagnosisCreateInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        cidCode: ' j18.9  ',
        diagnosisType: 'principal',
        notes: 'Pneumonia confirmada por RX de tórax',
      });

      expect(result.cidCode).toBe('J18.9');
      expect(result.diagnosisType).toBe('principal');
      expect(result.notes).toBe('Pneumonia confirmada por RX de tórax');
    });

    it('exige codigo CID-10', () => {
      expect(() =>
        validateDiagnosisCreateInput({
          consultationId: 'con-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          cidCode: '   ',
          diagnosisType: 'principal',
        }),
      ).toThrowError(/O código CID-10 é obrigatório/);
    });

    it('rejeita tipo de diagnostico invalido', () => {
      expect(() =>
        validateDiagnosisCreateInput({
          consultationId: 'con-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          cidCode: 'J18.9',
          diagnosisType: 'invalido' as unknown as DiagnosisType,
        }),
      ).toThrowError(/Tipo de diagnóstico inválido/);
    });
  });

  describe('validateDiagnosisStatusUpdate', () => {
    it('permite alterar status para resolved sem notas obrigatorias', () => {
      const result = validateDiagnosisStatusUpdate({
        diagnosisId: 'diag-1',
        status: 'resolved',
      });

      expect(result.status).toBe('resolved');
    });

    it('exige justificativa clinica ao refutar diagnostico', () => {
      expect(() =>
        validateDiagnosisStatusUpdate({
          diagnosisId: 'diag-1',
          status: 'refuted',
          notes: '   ',
        }),
      ).toThrowError(/A justificativa médica\/nota clínica é obrigatória ao refutar um diagnóstico/);
    });

    it('permite refutar diagnostico quando justificativa e fornecida', () => {
      const result = validateDiagnosisStatusUpdate({
        diagnosisId: 'diag-1',
        status: 'refuted',
        notes: 'Descartada pneumonia após exames normais',
      });

      expect(result.status).toBe('refuted');
      expect(result.notes).toBe('Descartada pneumonia após exames normais');
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockDiagnosis: EncounterDiagnosis = {
      id: 'diag-100',
      consultationId: 'con-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      doctorId: mockActorId,
      cidCode: 'J18.9',
      cidDescription: 'Pneumonia não especificada',
      diagnosisType: 'principal',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria evento PatientDiagnosisRecorded', () => {
      const ev = createPatientDiagnosisRecordedEvent(mockDiagnosis, mockActorId);
      expect(ev.type).toBe('PatientDiagnosisRecorded');
      expect(ev.aggregateId).toBe('diag-100');
      expect((ev.payload as { cidCode: string }).cidCode).toBe('J18.9');
    });

    it('cria evento PatientDiagnosisUpdated', () => {
      const mockUpdated: EncounterDiagnosis = {
        ...mockDiagnosis,
        status: 'refuted',
        notes: 'Refutado após TC de tórax',
      };

      const ev = createPatientDiagnosisUpdatedEvent(mockUpdated, mockActorId);
      expect(ev.type).toBe('PatientDiagnosisUpdated');
      expect(ev.aggregateId).toBe('diag-100');
      expect((ev.payload as { status: string }).status).toBe('refuted');
    });
  });
});
