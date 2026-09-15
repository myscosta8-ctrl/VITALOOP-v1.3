import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import {
  assertValidEncounterStatusTransition,
  isTerminalEncounterStatus,
  isValidEncounterStatusTransition,
} from './state-machine.js';

describe('Encounter State Machine (ENC-006)', () => {
  it('valida estados terminais corretamente', () => {
    expect(isTerminalEncounterStatus('completed')).toBe(true);
    expect(isTerminalEncounterStatus('canceled')).toBe(true);
    expect(isTerminalEncounterStatus('created')).toBe(false);
    expect(isTerminalEncounterStatus('in_consultation')).toBe(false);
  });

  it('permite transições de estado válidas', () => {
    expect(isValidEncounterStatusTransition('created', 'triage_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('triage_pending', 'triaged')).toBe(true);
    expect(isValidEncounterStatusTransition('triaged', 'consultation_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('consultation_pending', 'in_consultation')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'post_consultation')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'canceled')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'canceled')).toBe(true);
  });

  // 'admitted' (internado): estado ativo de cuidado contínuo (migration
  // 0081/0082) — cobre o que ficou sem teste desde que o estado foi
  // introduzido: pode ser alcançado de in_consultation OU post_consultation,
  // permite auto-transição (evolução/reavaliação sem trocar de estado), só
  // sai para completed (nunca canceled — internação se encerra por alta/
  // óbito/transferência, não se "cancela"). A trava real de "precisa de
  // leito ativo" mora no banco (trigger guard_encounter_admission_transition,
  // não neste código puro), então não é testada aqui.
  it('permite internar (admitted) a partir de in_consultation ou post_consultation, e evoluir sem trocar de estado', () => {
    expect(isValidEncounterStatusTransition('in_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('admitted', 'admitted')).toBe(true);
  });

  it('só permite sair de admitted para completed (alta hospitalar) — nunca para canceled', () => {
    expect(isValidEncounterStatusTransition('admitted', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('admitted', 'canceled')).toBe(false);
    expect(isValidEncounterStatusTransition('admitted', 'triage_pending')).toBe(false);
  });

  it('rejeita transições de estado inválidas', () => {
    expect(isValidEncounterStatusTransition('created', 'completed')).toBe(false);
    expect(isValidEncounterStatusTransition('triaged', 'in_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('completed', 'in_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('canceled', 'created')).toBe(false);
  });

  it('assertValidEncounterStatusTransition lança exceção em transições proibidas', () => {
    expect(() => assertValidEncounterStatusTransition('created', 'completed')).toThrow(AppError);
    expect(() => assertValidEncounterStatusTransition('completed', 'in_consultation')).toThrow(AppError);
  });

  it('exige motivo de cancelamento ao mudar para canceled', () => {
    expect(() => assertValidEncounterStatusTransition('created', 'canceled', '')).toThrow(AppError);
    expect(() => assertValidEncounterStatusTransition('created', 'canceled', '  ')).toThrow(AppError);
    expect(() =>
      assertValidEncounterStatusTransition('created', 'canceled', 'Desistência do paciente'),
    ).not.toThrow();
  });

  it('exige sub-status ao mudar para post_consultation', () => {
    expect(() => assertValidEncounterStatusTransition('in_consultation', 'post_consultation')).toThrow(
      AppError,
    );
    expect(() =>
      assertValidEncounterStatusTransition('in_consultation', 'post_consultation', null, 'medicando'),
    ).not.toThrow();
  });

  it('permite concluir (completed) um atendimento internado sem exigir motivo de cancelamento ou sub-status', () => {
    expect(() => assertValidEncounterStatusTransition('admitted', 'completed')).not.toThrow();
    expect(() => assertValidEncounterStatusTransition('admitted', 'canceled', 'Qualquer motivo')).toThrow(
      AppError,
    );
  });
});

describe('Bloco 6 — fluxo médico pós-triagem', () => {
  it('atendimento encaminhado para consultório pode entrar no fluxo médico (triaged → consultation_pending → in_consultation)', () => {
    expect(isValidEncounterStatusTransition('triaged', 'consultation_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('consultation_pending', 'in_consultation')).toBe(true);
  });

  it('Sala Vermelha usa exatamente a mesma máquina de estados — nenhuma transição especial/paralela existe para ela (regra: não misturar destino da triagem com estado do atendimento)', () => {
    // Não há (e não deve haver) um EncounterStatus tipo 'in_red_room' — Sala
    // Vermelha e consultório compartilham a mesma transição
    // triaged→consultation_pending→in_consultation (Bloco 5); a distinção
    // de "para onde o paciente vai" vive só no destino da Triagem
    // (packages/domain/src/triage), nunca na máquina de estados do
    // atendimento.
    expect(isValidEncounterStatusTransition('triaged', 'consultation_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('consultation_pending', 'in_consultation')).toBe(true);
  });

  it('leito (admitted) nunca é alcançável a partir de estados anteriores à avaliação médica', () => {
    expect(isValidEncounterStatusTransition('triage_pending', 'admitted')).toBe(false);
    expect(isValidEncounterStatusTransition('triaged', 'admitted')).toBe(false);
    expect(isValidEncounterStatusTransition('consultation_pending', 'admitted')).toBe(false);
  });

  it('leito (admitted) só é alcançável a partir de estados que já passaram por avaliação médica (in_consultation/post_consultation)', () => {
    expect(isValidEncounterStatusTransition('in_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'admitted')).toBe(true);
  });
});

describe('Bloco 7 — observação/exame/procedimento pós-consulta', () => {
  it('observação/exame/procedimento (post_consultation) exige ter passado por avaliação médica — nunca alcançável direto de triaged/consultation_pending', () => {
    expect(isValidEncounterStatusTransition('triaged', 'post_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('consultation_pending', 'post_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('in_consultation', 'post_consultation')).toBe(true);
  });

  it('post_consultation_detail exige um valor válido para alcançar post_consultation (assertValidEncounterStatusTransition)', () => {
    expect(() => assertValidEncounterStatusTransition('in_consultation', 'post_consultation')).toThrow(AppError);
    expect(() =>
      assertValidEncounterStatusTransition('in_consultation', 'post_consultation', null, 'aguardando_exames_laboratoriais'),
    ).not.toThrow();
  });

  it('"observação não vira internação automaticamente": post_consultation → admitted é uma transição MANUAL válida, mas post_consultation nunca aparece como estado terminal nem se auto-transiciona (isTerminalEncounterStatus é falso e a máquina não define nenhuma transição automática — toda mudança de status exige uma chamada explícita)', () => {
    expect(isTerminalEncounterStatus('post_consultation')).toBe(false);
    // A única forma de sair de post_consultation é uma chamada explícita
    // (decisão médica) para um dos estados abaixo — nunca implícita.
    expect(isValidEncounterStatusTransition('post_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'canceled')).toBe(true);
  });
});

describe('Bloco 8 — internação/leito: nenhum caminho estrutural sem avaliação médica', () => {
  it('exame/procedimento direto da Triagem (Bloco 7) NUNCA alcança admitted sem passar por in_consultation/post_consultation', () => {
    // Um atendimento com destino 'exam'/'procedure' na Triagem permanece em
    // 'triaged' (Bloco 5/7 — nenhuma transição automática o move daí).
    // A única porta de entrada estrutural para 'admitted' continua sendo
    // in_consultation/post_consultation.
    expect(isValidEncounterStatusTransition('triaged', 'admitted')).toBe(false);
    expect(isValidEncounterStatusTransition('triage_pending', 'admitted')).toBe(false);
  });

  it('Sala Vermelha não tem nenhuma transição especial para admitted — usa exatamente os mesmos predecessores de qualquer outro destino', () => {
    // Não existe (nem deve existir) diferenciação por destino da triagem na
    // máquina de estados do atendimento — Sala Vermelha e consultório
    // compartilham as mesmas regras de chegada a 'admitted'.
    expect(isValidEncounterStatusTransition('consultation_pending', 'admitted')).toBe(false);
    expect(isValidEncounterStatusTransition('in_consultation', 'admitted')).toBe(true);
  });
});
