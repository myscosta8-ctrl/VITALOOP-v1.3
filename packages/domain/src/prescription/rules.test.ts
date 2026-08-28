import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createAllergyAlertOverriddenEvent,
  createPrescriptionCanceledEvent,
  createPrescriptionRecordedEvent,
} from './events.js';
import {
  checkPatientAllergies,
  validatePrescriptionCancelInput,
  validatePrescriptionCreateInput,
  validatePrescriptionItemInput,
} from './rules.js';
import type { Prescription } from './types.js';

describe('Prescription Domain Rules & Events', () => {
  describe('checkPatientAllergies', () => {
    it('detecta alergia quando o medicamento contem a substancia alergenica', () => {
      const result = checkPatientAllergies('Dipirona Sódica 500mg', 'dipirona', ['Dipirona', 'Penicilina']);
      expect(result).toBe('Dipirona');
    });

    it('retorna null se paciente nao possui alergia ao medicamento prescrito', () => {
      const result = checkPatientAllergies('Paracetamol 750mg', 'paracetamol', ['Dipirona', 'Penicilina']);
      expect(result).toBeNull();
    });
  });

  describe('validatePrescriptionItemInput', () => {
    it('valida item de prescricao valido', () => {
      const result = validatePrescriptionItemInput({
        medicationName: 'Dipirona 500mg/ml',
        dose: 2,
        doseUnit: 'ml',
        route: 'EV',
        frequency: 'de 6 em 6 horas',
      });

      expect(result.medicationName).toBe('Dipirona 500mg/ml');
      expect(result.dose).toBe(2);
      expect(result.route).toBe('EV');
    });

    it('rejeita dose igual ou menor que zero', () => {
      expect(() =>
        validatePrescriptionItemInput({
          medicationName: 'Dipirona 500mg',
          dose: 0,
          doseUnit: 'ml',
          route: 'EV',
          frequency: '6/6h',
        }),
      ).toThrowError(/Dose inválida/);
    });
  });

  describe('validatePrescriptionCreateInput & Allergy Check', () => {
    it('permite criar prescricao sem alergias sem necessidade de justificativa', () => {
      const { validatedInput, detectedAllergies } = validatePrescriptionCreateInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        knownPatientAllergies: ['Penicilina'],
        items: [
          {
            medicationName: 'Dipirona 500mg',
            dose: 1,
            doseUnit: 'comprimido',
            route: 'VO',
            frequency: '6/6h',
          },
        ],
      });

      expect(validatedInput.items.length).toBe(1);
      expect(detectedAllergies.length).toBe(0);
    });

    it('bloqueia prescricao de medicamento alergênico se nao houver justificativa medica valida (min 10 caracteres)', () => {
      expect(() =>
        validatePrescriptionCreateInput({
          consultationId: 'con-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          knownPatientAllergies: ['Dipirona'],
          items: [
            {
              medicationName: 'Dipirona 500mg',
              dose: 1,
              doseUnit: 'comprimido',
              route: 'VO',
              frequency: '6/6h',
            },
          ],
        }),
      ).toThrowError(/Alerta de Alergia detectado/);
    });

    it('aceita prescricao com medicamento alergênico quando justificativa valida e fornecida', () => {
      const { validatedInput, detectedAllergies } = validatePrescriptionCreateInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        knownPatientAllergies: ['Dipirona'],
        overrideJustification: 'Paciente em uso prévio sem reações adversas graves',
        items: [
          {
            medicationName: 'Dipirona 500mg',
            activeSubstance: 'dipirona',
            dose: 1,
            doseUnit: 'comprimido',
            route: 'VO',
            frequency: '6/6h',
          },
        ],
      });

      expect(detectedAllergies.length).toBe(1);
      expect(detectedAllergies[0].allergen).toBe('Dipirona');
      expect(validatedInput.overrideJustification).toContain('sem reações');
    });
  });

  describe('validatePrescriptionCancelInput', () => {
    it('exige motivo do cancelamento', () => {
      expect(() =>
        validatePrescriptionCancelInput({
          prescriptionId: 'presc-1',
          cancelReason: '   ',
        }),
      ).toThrowError(/O motivo do cancelamento da prescrição médica é obrigatório/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockPrescription: Prescription = {
      id: 'presc-1',
      consultationId: 'con-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      doctorId: mockActorId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria evento PrescriptionRecorded', () => {
      const ev = createPrescriptionRecordedEvent(mockPrescription, mockActorId);
      expect(ev.type).toBe('PrescriptionRecorded');
      expect(ev.aggregateId).toBe('presc-1');
    });

    it('cria evento PrescriptionCanceled', () => {
      const ev = createPrescriptionCanceledEvent(
        'presc-1' as UUID,
        'enc-1' as UUID,
        'pat-1' as UUID,
        'Prescrição substituída por alteração de quadro',
        mockActorId,
      );
      expect(ev.type).toBe('PrescriptionCanceled');
    });

    it('cria evento AllergyAlertOverridden', () => {
      const ev = createAllergyAlertOverriddenEvent(
        'presc-1' as UUID,
        'enc-1' as UUID,
        'pat-1' as UUID,
        'Dipirona',
        'Justificativa médica de sobreposição consciente',
        mockActorId,
      );
      expect(ev.type).toBe('AllergyAlertOverridden');
    });
  });
});
