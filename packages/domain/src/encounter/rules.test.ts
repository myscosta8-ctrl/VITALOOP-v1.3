import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import { validateEncounterCreateInput } from './rules.js';

describe('Encounter Domain Rules', () => {
  it('valida formulário de criação com sucesso', () => {
    const valid = validateEncounterCreateInput({
      patientId: 'pat-123',
      institutionId: 'inst-123',
      encounterType: 'urgency',
      origin: 'spontaneous',
      chiefComplaint: 'Dor de cabeça forte',
    });

    expect(valid.patientId).toBe('pat-123');
    expect(valid.institutionId).toBe('inst-123');
    expect(valid.chiefComplaint).toBe('Dor de cabeça forte');
  });

  it('exige patientId, institutionId e chiefComplaint', () => {
    expect(() =>
      validateEncounterCreateInput({
        patientId: '',
        institutionId: 'inst-123',
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Queixa',
      }),
    ).toThrow(AppError);

    expect(() =>
      validateEncounterCreateInput({
        patientId: 'pat-123',
        institutionId: '',
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Queixa',
      }),
    ).toThrow(AppError);

    expect(() =>
      validateEncounterCreateInput({
        patientId: 'pat-123',
        institutionId: 'inst-123',
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: '   ',
      }),
    ).toThrow(AppError);
  });
});
