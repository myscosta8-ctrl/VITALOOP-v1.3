/**
 * Representa os três cenários de duplicidade já implementados pela API
 * (Etapa 2/6, `app.detect_patient_duplicates()`): forte, fraca e conflito.
 *
 * Regra de escopo (Doc 1 §11 — "confirmação antes de criar provável
 * duplicado"): esta interface NUNCA decide sozinha se é duplicidade — apenas
 * exibe o que a API já decidiu e pede confirmação humana explícita antes de
 * repetir a chamada com `confirmDuplicate: true`. Conflito de identidade é
 * tratado de forma deliberadamente MAIS RÍGIDA que duplicidade simples
 * (checkbox de ciência obrigatório) — nunca equiparado a uma duplicidade
 * rotineira de um clique.
 */

import { useState } from 'react';
import type { DuplicateErrorMatch } from '../lib/patients-api.js';

export interface DuplicateWarningProps {
  readonly matches: readonly DuplicateErrorMatch[];
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly confirming: boolean;
}

const strengthLabel: Record<string, string> = {
  strong: 'Duplicidade forte (mesmo CPF ou CNS)',
  weak: 'Possível duplicidade (mesmo nome e data de nascimento)',
  conflict: 'Conflito de identidade — requer revisão humana',
};

export const DuplicateWarning = ({
  matches,
  onConfirm,
  onCancel,
  confirming,
}: DuplicateWarningProps): JSX.Element => {
  const hasConflict = matches.some((m) => m.matchStrength === 'conflict');
  const [acknowledgedConflict, setAcknowledgedConflict] = useState(false);

  return (
    <div role="alertdialog" aria-labelledby="duplicate-warning-heading">
      <h2 id="duplicate-warning-heading">
        {hasConflict ? 'Conflito de identidade encontrado' : 'Possível duplicidade encontrada'}
      </h2>
      <ul>
        {matches.map((m) => (
          <li key={m.candidateId}>
            {strengthLabel[m.matchStrength] ?? m.matchStrength} — paciente {m.candidateId}
          </li>
        ))}
      </ul>
      {hasConflict ? (
        <>
          <p role="alert">
            Existe outro paciente com o MESMO CPF/CNS mas nome DIFERENTE. Isto pode ser um
            erro de cadastro ou identidade indevida — não trate como duplicidade comum.
            Confirmar aqui registra o novo cadastro para revisão posterior, não resolve o
            conflito automaticamente.
          </p>
          <label htmlFor="ack-conflict">
            <input
              id="ack-conflict"
              type="checkbox"
              checked={acknowledgedConflict}
              onChange={(e) => setAcknowledgedConflict(e.target.checked)}
            />
            Estou ciente de que isto é um conflito de identidade e será registrado para
            revisão humana.
          </label>
        </>
      ) : (
        <p>
          Verifique se não é o mesmo paciente antes de continuar. Se for uma pessoa
          diferente, você pode confirmar e cadastrar normalmente.
        </p>
      )}
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming || (hasConflict && !acknowledgedConflict)}
      >
        {confirming ? 'Cadastrando…' : 'Confirmar e cadastrar mesmo assim'}
      </button>
      <button type="button" onClick={onCancel} disabled={confirming}>
        Cancelar
      </button>
    </div>
  );
};
