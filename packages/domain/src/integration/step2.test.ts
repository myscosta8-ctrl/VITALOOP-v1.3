import { describe, it, expect } from 'vitest';
import { validatePharmacyDispensationInput } from './pharmacy.js';
import { validateAndBuildAihBatch } from './aih-exporter.js';
import { buildRndsBundle } from './rnds-adapter.js';
import { validateIdentityProviderConfig } from './federated-identity.js';

describe('Regras de Domínio da Fase 9 / Etapa 2 (INT-004..008)', () => {
  it('valida itens de dispensação de farmácia central (INT-004)', () => {
    expect(() => {
      validatePharmacyDispensationInput([]);
    }).toThrow('Ao menos um item medicamento deve ser fornecido');

    expect(() => {
      validatePharmacyDispensationInput([{ medicationName: 'Dipirona 500mg', quantity: 2, dosage: '1 comprimido de 6/6h' }]);
    }).not.toThrow();
  });

  it('valida e constrói lote de exportação de AIHs elegíveis (INT-007)', () => {
    const validAihs = [
      { id: 'aih-1', mainProcedureCode: '0303060280', mainCid10: 'J18.9', status: 'validated', closedAt: new Date().toISOString() },
    ];
    const batch = validateAndBuildAihBatch(validAihs);
    expect(batch.totalItems).toBe(1);
    expect(batch.batchNumber).toContain('LOTE-AIH-');

    expect(() => {
      validateAndBuildAihBatch([{ id: 'aih-2', mainProcedureCode: '0303060280', mainCid10: 'J18.9', status: 'validated', closedAt: null }]);
    }).toThrow('não possui fechamento final validado');
  });

  it('constrói pacote FHIR Bundle para envio RNDS/DATASUS (INT-006)', () => {
    const bundle = buildRndsBundle({
      patientCns: '700000000000001',
      encounterId: 'enc-123',
      clinicalSummary: 'Paciente tratado com antibioticoterapia para pneumonia',
    });
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.entry[0].resource.subject.identifier.value).toBe('700000000000001');
  });

  it('valida configuração de IdP de identidade federada corporativa (INT-008)', () => {
    expect(() => {
      validateIdentityProviderConfig({ providerType: 'oidc', providerName: 'Gov.br SSO', clientId: 'vitaloop-client-id' });
    }).not.toThrow();
  });
});
