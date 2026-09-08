import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { ANTIMICROBIAL_REQUEST_SCHEMA } from './schema.js';

describe('ANTIMICROBIAL_REQUEST_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = ANTIMICROBIAL_REQUEST_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('a lista de medicamentos tem exatamente os 8 antibióticos de uso restrito do impresso', () => {
    const medicamento = ANTIMICROBIAL_REQUEST_SCHEMA.groups
      .flatMap((g) => g.fields)
      .find((f) => f.code === 'medicamento');
    expect(medicamento?.options?.map((o) => o.code)).toEqual([
      'cefepime',
      'ciprofloxacino',
      'clindamicina',
      'levofloxacino',
      'meropenem',
      'metronidazol',
      'piperacilina_tazobactam',
      'vancomicina',
    ]);
  });

  it('exige diagnóstico, justificativa, medicamento, posologia, dose, intervalo, tempo de uso e dados do solicitante', () => {
    const errors = validateFormValues(ANTIMICROBIAL_REQUEST_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'diagnostico',
        'justificativa',
        'medicamento',
        'posologia',
        'dose',
        'intervalo',
        'tempo_uso_dias',
        'medico_solicitante_nome',
        'medico_solicitante_crm',
        'data_solicitacao',
      ]),
    );
  });

  it('não exige parecer do farmacêutico (preenchido depois, em revisão separada)', () => {
    const errors = validateFormValues(ANTIMICROBIAL_REQUEST_SCHEMA, {
      diagnostico: 'x',
      justificativa: 'x',
      medicamento: 'vancomicina',
      posologia: 'x',
      dose: '500',
      intervalo: '8/8h',
      tempo_uso_dias: '7',
      medico_solicitante_nome: 'Dr. Teste',
      medico_solicitante_crm: '12345',
      data_solicitacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });

  it('médico solicitante/CRM não são o mesmo dado que `requested_by` — são carimbo/assinatura manual, podem ser pessoas diferentes', () => {
    // Documenta a decisão (ver comentário em schema.ts): quem está logado
    // registrando (`requested_by`, fora deste schema) pode não ser quem
    // carimba/assina o impresso — por isso nome/CRM continuam sendo campos
    // próprios do formulário, não substituídos pelo usuário da sessão.
    const solicitacaoGroup = ANTIMICROBIAL_REQUEST_SCHEMA.groups.find((g) => g.title === 'Solicitação');
    expect(solicitacaoGroup?.fields.map((f) => f.code)).toEqual(
      expect.arrayContaining(['medico_solicitante_nome', 'medico_solicitante_crm']),
    );
  });
});
