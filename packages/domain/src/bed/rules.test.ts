import { describe, it, expect } from 'vitest';
import { validateAllocateBedInput, validateTransferBedInput, calculateBedStayHours } from './rules.js';

describe('Regras de Domínio de Leitos (BED)', () => {
  it('valida alocação de leito disponível com sucesso', () => {
    expect(() =>
      validateAllocateBedInput(
        {
          bedId: '11111111-1111-1111-1111-111111111111',
          encounterId: '22222222-2222-2222-2222-222222222222',
          patientId: '33333333-3333-3333-3333-333333333333',
          allocatedBy: '44444444-4444-4444-4444-444444444444',
        },
        'available',
      ),
    ).not.toThrow();
  });

  it('bloqueia alocação se o leito estiver ocupado ou em higienização', () => {
    expect(() =>
      validateAllocateBedInput(
        {
          bedId: '11111111-1111-1111-1111-111111111111',
          encounterId: '22222222-2222-2222-2222-222222222222',
          patientId: '33333333-3333-3333-3333-333333333333',
          allocatedBy: '44444444-4444-4444-4444-444444444444',
        },
        'occupied',
      ),
    ).toThrow('O leito não está disponível para alocação');
  });

  it('valida transferência de leito com justificativa válida', () => {
    expect(() =>
      validateTransferBedInput(
        {
          allocationId: '55555555-5555-5555-5555-555555555555',
          sourceBedId: '11111111-1111-1111-1111-111111111111',
          targetBedId: '66666666-6666-6666-6666-666666666666',
          encounterId: '22222222-2222-2222-2222-222222222222',
          patientId: '33333333-3333-3333-3333-333333333333',
          transferredBy: '44444444-4444-4444-4444-444444444444',
          transferReason: 'Paciente necessita de monitorização contínua em Sala Vermelha.',
        },
        'available',
      ),
    ).not.toThrow();
  });

  it('bloqueia transferência para o mesmo leito de origem', () => {
    expect(() =>
      validateTransferBedInput(
        {
          allocationId: '55555555-5555-5555-5555-555555555555',
          sourceBedId: '11111111-1111-1111-1111-111111111111',
          targetBedId: '11111111-1111-1111-1111-111111111111',
          encounterId: '22222222-2222-2222-2222-222222222222',
          patientId: '33333333-3333-3333-3333-333333333333',
          transferredBy: '44444444-4444-4444-4444-444444444444',
          transferReason: 'Transferência para o mesmo leito.',
        },
        'available',
      ),
    ).toThrow('O leito de destino deve ser diferente do leito de origem.');
  });

  it('bloqueia transferência se a justificativa tiver menos de 10 caracteres', () => {
    expect(() =>
      validateTransferBedInput(
        {
          allocationId: '55555555-5555-5555-5555-555555555555',
          sourceBedId: '11111111-1111-1111-1111-111111111111',
          targetBedId: '66666666-6666-6666-6666-666666666666',
          encounterId: '22222222-2222-2222-2222-222222222222',
          patientId: '33333333-3333-3333-3333-333333333333',
          transferredBy: '44444444-4444-4444-4444-444444444444',
          transferReason: 'Curto',
        },
        'available',
      ),
    ).toThrow('A transferência de leito exige justificativa técnica/clínica de no mínimo 10 caracteres.');
  });

  it('calcula o tempo de permanência no leito e alerta limite de 24h', () => {
    const TwentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const result = calculateBedStayHours(TwentyFiveHoursAgo);
    expect(result.hours).toBeGreaterThanOrEqual(24.9);
    expect(result.is24hLimitExceeded).toBe(true);
  });
});
