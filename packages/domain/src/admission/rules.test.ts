import { describe, it, expect } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import { validateAdmissionCreateInput, validateAdmissionUpdateInput, validateAdmissionDischargeInput } from './rules.js';
import {
  createAdmissionUpdatedEvent,
  createPatientAdmittedEvent,
  createPatientDischargedFromAdmissionEvent,
} from './events.js';

const baseCreate = {
  encounterId: '11111111-1111-1111-1111-111111111111',
  patientId: '22222222-2222-2222-2222-222222222222',
  admittingDoctorId: '33333333-3333-3333-3333-333333333333',
  admissionDiagnosisDescription: 'Pneumonia bacteriana grave',
  admissionJustification: 'Necessita monitorização e antibioticoterapia endovenosa contínua.',
};

describe('Regras de Domínio de Internação (ADMISSION)', () => {
  it('valida criação de internação com dados completos', () => {
    expect(() => validateAdmissionCreateInput(baseCreate)).not.toThrow();
  });

  it('bloqueia internação sem justificativa suficiente', () => {
    expect(() =>
      validateAdmissionCreateInput({ ...baseCreate, admissionJustification: 'curto' }),
    ).toThrow('justificativa clínica de internação exige no mínimo 10 caracteres');
  });

  it('bloqueia internação sem diagnóstico', () => {
    expect(() =>
      validateAdmissionCreateInput({ ...baseCreate, admissionDiagnosisDescription: '' }),
    ).toThrow('diagnóstico de admissão é obrigatório');
  });

  it('valida evolução de internação com ao menos um campo', () => {
    expect(() =>
      validateAdmissionUpdateInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        updatedBy: '33333333-3333-3333-3333-333333333333',
        admissionJustification: 'Paciente evoluindo com melhora do quadro respiratório.',
      }),
    ).not.toThrow();
  });

  it('bloqueia evolução vazia', () => {
    expect(() =>
      validateAdmissionUpdateInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        updatedBy: '33333333-3333-3333-3333-333333333333',
      }),
    ).toThrow('Informe ao menos um campo');
  });

  it('valida alta de internação', () => {
    expect(() =>
      validateAdmissionDischargeInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        encounterId: baseCreate.encounterId,
        patientId: baseCreate.patientId,
        dischargedBy: baseCreate.admittingDoctorId,
        status: 'discharged',
      }),
    ).not.toThrow();
  });

  it('exige causa ao registrar óbito', () => {
    expect(() =>
      validateAdmissionDischargeInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        encounterId: baseCreate.encounterId,
        patientId: baseCreate.patientId,
        dischargedBy: baseCreate.admittingDoctorId,
        status: 'deceased',
      }),
    ).toThrow('registro de óbito exige uma causa');
  });

  it('valida transferência para outra unidade sem exigir motivo', () => {
    expect(() =>
      validateAdmissionDischargeInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        encounterId: baseCreate.encounterId,
        patientId: baseCreate.patientId,
        dischargedBy: baseCreate.admittingDoctorId,
        status: 'transferred_out',
      }),
    ).not.toThrow();
  });

  it('aceita causa de óbito curta como inválida (mínimo 3 caracteres)', () => {
    expect(() =>
      validateAdmissionDischargeInput({
        admissionId: '44444444-4444-4444-4444-444444444444',
        encounterId: baseCreate.encounterId,
        patientId: baseCreate.patientId,
        dischargedBy: baseCreate.admittingDoctorId,
        status: 'deceased',
        endReason: 'AB',
      }),
    ).toThrow('registro de óbito exige uma causa');
  });

  it('bloqueia internação sem atendimento, paciente ou médico responsável', () => {
    expect(() =>
      validateAdmissionCreateInput({ ...baseCreate, encounterId: '' }),
    ).toThrow('Atendimento, paciente e médico responsável são obrigatórios');
    expect(() => validateAdmissionCreateInput({ ...baseCreate, patientId: '' })).toThrow(
      'Atendimento, paciente e médico responsável são obrigatórios',
    );
    expect(() =>
      validateAdmissionCreateInput({ ...baseCreate, admittingDoctorId: '' }),
    ).toThrow('Atendimento, paciente e médico responsável são obrigatórios');
  });

  it('bloqueia diagnóstico de admissão com menos de 3 caracteres', () => {
    expect(() =>
      validateAdmissionCreateInput({ ...baseCreate, admissionDiagnosisDescription: 'AB' }),
    ).toThrow('diagnóstico de admissão é obrigatório');
  });

  it('bloqueia encerramento de internação sem internação, atendimento, paciente ou responsável', () => {
    expect(() =>
      validateAdmissionDischargeInput({
        admissionId: '',
        encounterId: baseCreate.encounterId,
        patientId: baseCreate.patientId,
        dischargedBy: baseCreate.admittingDoctorId,
        status: 'discharged',
      }),
    ).toThrow('Internação, atendimento e profissional responsável');
  });

  describe('Eventos de domínio', () => {
    const mockAdmissionId = '44444444-4444-4444-4444-444444444444' as UUID;
    const mockEncounterId = baseCreate.encounterId as UUID;
    const mockPatientId = baseCreate.patientId as UUID;
    const mockDoctorId = baseCreate.admittingDoctorId as UUID;

    it('cria evento PatientAdmitted com o médico responsável como ator', () => {
      const ev = createPatientAdmittedEvent({
        admissionId: mockAdmissionId,
        encounterId: mockEncounterId,
        patientId: mockPatientId,
        admittingDoctorId: mockDoctorId,
        admissionDiagnosisDescription: baseCreate.admissionDiagnosisDescription,
      });
      expect(ev.type).toBe('PatientAdmitted');
      expect(ev.aggregateType).toBe('admission');
      expect(ev.aggregateId).toBe(mockAdmissionId);
      expect(ev.actorId).toBe(mockDoctorId);
    });

    it('cria evento AdmissionUpdated com quem evoluiu como ator', () => {
      const ev = createAdmissionUpdatedEvent({
        admissionId: mockAdmissionId,
        encounterId: mockEncounterId,
        patientId: mockPatientId,
        updatedBy: mockDoctorId,
      });
      expect(ev.type).toBe('AdmissionUpdated');
      expect(ev.actorId).toBe(mockDoctorId);
    });

    it('cria evento PatientDischargedFromAdmission preservando o status de encerramento', () => {
      const ev = createPatientDischargedFromAdmissionEvent({
        admissionId: mockAdmissionId,
        encounterId: mockEncounterId,
        patientId: mockPatientId,
        dischargedBy: mockDoctorId,
        status: 'deceased',
      });
      expect(ev.type).toBe('PatientDischargedFromAdmission');
      expect((ev.payload as { status: string }).status).toBe('deceased');
    });
  });
});
