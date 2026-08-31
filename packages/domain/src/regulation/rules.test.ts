import { describe, it, expect } from 'vitest';
import { validateRegulationInput, validateRegulationStatusTransition } from './rules.js';

describe('Regras de Domínio de Regulação Médica e Transferência Externa (SUS-007..010)', () => {
  it('valida dados obrigatórios de solicitação de regulação externa (SUS-007)', () => {
    expect(() => {
      validateRegulationInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        destinationFacility: '',
        specialty: 'Cardiologia',
        priority: 'high',
        transportType: 'samu',
      });
    }).toThrow('O estabelecimento de saúde de destino pretendido é obrigatório para regulação médica.');

    expect(() => {
      validateRegulationInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        destinationFacility: 'Hospital das Clínicas',
        specialty: 'Cardiologia',
        priority: 'high',
        transportType: 'samu',
      });
    }).not.toThrow();
  });

  it('valida máquina de estados e transições de status da regulação (SUS-008)', () => {
    // Transição válida: requested -> accepted
    expect(() => {
      validateRegulationStatusTransition('requested', 'accepted');
    }).not.toThrow();

    // Transição válida: accepted -> transferred
    expect(() => {
      validateRegulationStatusTransition('accepted', 'transferred');
    }).not.toThrow();

    // Transição inválida: transferred -> requested (estado final)
    expect(() => {
      validateRegulationStatusTransition('transferred', 'requested');
    }).toThrow("Não é possível alterar o status de uma regulação no estado final 'transferred'.");

    // Cancelamento sem motivo -> exceção
    expect(() => {
      validateRegulationStatusTransition('requested', 'canceled', '');
    }).toThrow('O motivo de cancelamento da regulação é obrigatório');
  });
});
