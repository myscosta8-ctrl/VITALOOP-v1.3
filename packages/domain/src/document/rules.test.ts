import { describe, it, expect } from 'vitest';
import {
  numberToWords,
  validateClinicalDocumentInput,
  validateRevokeClinicalDocumentInput,
} from './rules.js';

describe('Regras de Domínio de Documentos Clínicos (DOC-001..010)', () => {
  it('converte números de dias para extensão em português corretamente', () => {
    expect(numberToWords(1)).toBe('um');
    expect(numberToWords(3)).toBe('três');
    expect(numberToWords(7)).toBe('sete');
    expect(numberToWords(15)).toBe('quinze');
    expect(numberToWords(30)).toBe('trinta');
  });

  it('valida dados obrigatórios de Atestado Médico (DOC-001)', () => {
    expect(() => {
      validateClinicalDocumentInput({
        documentType: 'medical_certificate',
        title: 'Atestado Médico',
        content: 'Conteúdo válido do atestado com detalhes suficientes.',
        daysOff: 0,
      });
    }).toThrow('O atestado médico exige a quantidade de dias de afastamento (maior que zero).');

    expect(() => {
      validateClinicalDocumentInput({
        documentType: 'medical_certificate',
        title: 'Atestado Médico',
        content: 'Conteúdo válido do atestado com detalhes suficientes.',
        daysOff: 3,
      });
    }).not.toThrow();
  });

  it('valida dados obrigatórios de Atestado de Acompanhante (DOC-003)', () => {
    expect(() => {
      validateClinicalDocumentInput({
        documentType: 'companion_certificate',
        title: 'Atestado de Acompanhante',
        content: 'Conteúdo válido do atestado de acompanhante.',
        companionName: '',
      });
    }).toThrow('O atestado de acompanhante exige o nome do acompanhante (mínimo 3 caracteres).');

    expect(() => {
      validateClinicalDocumentInput({
        documentType: 'companion_certificate',
        title: 'Atestado de Acompanhante',
        content: 'Conteúdo válido do atestado de acompanhante.',
        companionName: 'Maria Silva',
      });
    }).not.toThrow();
  });

  it('valida justificativa de cancelamento/retificação de documento (DOC-008)', () => {
    expect(() => {
      validateRevokeClinicalDocumentInput({ revocationReason: 'Curto' });
    }).toThrow('O cancelamento/retificação de documento exige justificativa clínica mínima de 10 caracteres.');

    expect(() => {
      validateRevokeClinicalDocumentInput({ revocationReason: 'Cancelamento por erro de digitação do número de dias.' });
    }).not.toThrow();
  });
});
