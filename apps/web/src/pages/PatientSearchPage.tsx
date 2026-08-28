/**
 * Busca e identificação de paciente (Doc 1 §11/§12; PAT-002..006).
 *
 * "Identificação inequívoca" (Doc 1 §12): cada resultado mostra nome, nome
 * social, prontuário, nascimento e CPF/CNS truncado — o suficiente para o
 * usuário confirmar que está abrindo o paciente CERTO antes de prosseguir,
 * sem expor mais dado do que a listagem exige (a tela de detalhe, atrás de
 * `patient.read`, mostra o restante).
 */

import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createPatientsApi, type Patient } from '../lib/patients-api.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';

type SearchState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'results'; readonly patients: readonly Patient[] }
  | { readonly kind: 'empty' }
  | { readonly kind: 'denied'; readonly reason: 'unauthenticated' | 'forbidden' }
  | { readonly kind: 'error'; readonly message: string };

const maskCpf = (cpf: string | null): string =>
  cpf ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : '—';

export const PatientSearchPage = (): JSX.Element => {
  const { api } = useSession();
  const patientsApi = createPatientsApi(api);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [mrn, setMrn] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name && !cpf && !cns && !mrn) return;
    setState({ kind: 'loading' });
    try {
      const params: Parameters<typeof patientsApi.search>[0] = {
        ...(name ? { name } : {}),
        ...(cpf ? { cpf } : {}),
        ...(cns ? { cns } : {}),
        ...(mrn ? { mrn } : {}),
      };
      const results = await patientsApi.search(params);
      setState(results.length > 0 ? { kind: 'results', patients: results } : { kind: 'empty' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ kind: 'denied', reason: 'unauthenticated' });
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setState({ kind: 'denied', reason: 'forbidden' });
        return;
      }
      setState({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Falha ao buscar pacientes.',
      });
    }
  };

  if (state.kind === 'denied') return <AccessDeniedPage reason={state.reason} />;

  return (
    <main aria-labelledby="patient-search-heading">
      <h1 id="patient-search-heading">Buscar paciente</h1>
      <p>
        Busque por nome, CPF, CNS ou número de prontuário antes de cadastrar — evita
        duplicidade e abertura equivocada de prontuário (Doc 1 §11/§12).
      </p>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="search-name">Nome</label>
        <input id="search-name" value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="search-cpf">CPF</label>
        <input id="search-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />

        <label htmlFor="search-cns">CNS</label>
        <input id="search-cns" value={cns} onChange={(e) => setCns(e.target.value)} />

        <label htmlFor="search-mrn">Número de prontuário</label>
        <input id="search-mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} />

        <button type="submit" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      <p>
        <a href="#/pacientes/novo">Cadastrar novo paciente</a>
      </p>

      {state.kind === 'loading' && <p role="status">Carregando…</p>}

      {state.kind === 'empty' && (
        <p role="status">Nenhum paciente encontrado para os critérios informados.</p>
      )}

      {state.kind === 'error' && <p role="alert">{state.message}</p>}

      {state.kind === 'results' && (
        <table>
          <caption>Resultados da busca</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Nome social</th>
              <th scope="col">Prontuário</th>
              <th scope="col">Nascimento</th>
              <th scope="col">CPF</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {state.patients.map((p) => (
              <tr key={p.id}>
                <td>{p.fullName}</td>
                <td>{p.socialName ?? '—'}</td>
                <td>{p.medicalRecordNumber}</td>
                <td>{p.birthDate ?? '—'}</td>
                <td>{maskCpf(p.cpf)}</td>
                <td>
                  <a href={`#/pacientes/${p.id}`}>Abrir prontuário</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
};
