import { describe, it, expect } from 'vitest';
import { validateAdmissionCreateInput, validateAdmissionUpdateInput, validateAdmissionDischargeInput } from './rules.js';

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
});
