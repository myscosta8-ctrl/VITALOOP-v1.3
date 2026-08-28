/**
 * Detecção de duplicidade de paciente (PAT-015; Doc 1 §11) — espelha em TS
 * pura a lógica de `app.detect_patient_duplicates()` (migration 0017),
 * já testada real no banco (T3/T4, `PHASE_2_STEP_1_REPORT.md`). Permite
 * pré-checagem no domínio ANTES de persistir (Doc 1 §11: "confirmação antes
 * de criar provável duplicado"), sem exigir uma viagem ao banco para o
 * primeiro aviso ao usuário.
 *
 * Regras determinísticas — NÃO usa similaridade difusa/ML, mesma decisão já
 * tomada na migration 0017:
 *   forte    : mesmo CPF ou mesmo CNS já existente em outro paciente ATIVO,
 *              com o mesmo nome (normalizado).
 *   conflito : mesmo CPF/CNS, mas nome (normalizado) DIFERENTE — indício de
 *              erro de cadastro ou identidade indevida; exige revisão humana.
 *   fraco    : mesmo nome (normalizado) + mesma data de nascimento, sem
 *              CPF/CNS em comum.
 *
 * A persistência dos candidatos (`app.patient_duplicate_candidates`) e a
 * autoridade final continuam sendo a função SQL — esta função é para uso do
 * domínio/API antes de chamar o banco, não substitui o teste real já feito.
 */

import type { DuplicateMatchStrength, PatientDuplicateCandidateSource } from './types.js';
import { normalizeText } from './normalize-text.js';

export interface DuplicateMatch {
  readonly candidateId: PatientDuplicateCandidateSource['id'];
  readonly matchStrength: DuplicateMatchStrength;
  readonly matchReason: string;
}

const REASON_CONFLICT =
  'Mesmo CPF/CNS com nome diferente — possível erro de cadastro ou identidade indevida.';
const REASON_STRONG = 'Mesmo CPF ou CNS.';
const REASON_WEAK = 'Mesmo nome (normalizado) e data de nascimento.';

/**
 * Compara um paciente candidato (novo ou em edição) contra uma lista de
 * pacientes ativos já existentes, retornando os candidatos a duplicidade
 * encontrados — mesma prioridade de classificação da função SQL
 * (conflito > forte > fraco), avaliada por par.
 */
export const detectDuplicates = (
  subject: Pick<PatientDuplicateCandidateSource, 'fullName' | 'cpf' | 'cns' | 'birthDate'>,
  existing: readonly PatientDuplicateCandidateSource[],
): readonly DuplicateMatch[] => {
  const subjectName = normalizeText(subject.fullName);
  const matches: DuplicateMatch[] = [];

  for (const other of existing) {
    if (other.status !== 'active') continue;

    const otherName = normalizeText(other.fullName);
    const sameCpf = subject.cpf !== null && other.cpf === subject.cpf;
    const sameCns = subject.cns !== null && other.cns === subject.cns;
    const sameName = subjectName !== null && subjectName === otherName;
    const sameBirthDate =
      subject.birthDate !== null && subject.birthDate === other.birthDate;

    if ((sameCpf || sameCns) && !sameName) {
      matches.push({
        candidateId: other.id,
        matchStrength: 'conflict',
        matchReason: REASON_CONFLICT,
      });
      continue;
    }
    if (sameCpf || sameCns) {
      matches.push({
        candidateId: other.id,
        matchStrength: 'strong',
        matchReason: REASON_STRONG,
      });
      continue;
    }
    if (sameName && sameBirthDate) {
      matches.push({
        candidateId: other.id,
        matchStrength: 'weak',
        matchReason: REASON_WEAK,
      });
    }
  }

  return matches;
};

/** True se existir ao menos um candidato `strong`/`conflict` — exige confirmação humana antes de prosseguir (Doc 1 §11). */
export const requiresHumanConfirmation = (matches: readonly DuplicateMatch[]): boolean =>
  matches.some((m) => m.matchStrength === 'strong' || m.matchStrength === 'conflict');
