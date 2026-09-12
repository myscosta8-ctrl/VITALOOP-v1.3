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
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createPatientsApi } from '../lib/patients-api.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

const maskCpf = (cpf: string | null): string =>
  cpf ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : '—';

export const PatientSearchPage = (): JSX.Element => {
  const { api } = useSession();
  const patientsApi = createPatientsApi(api);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [mrn, setMrn] = useState('');
  const [denied, setDenied] = useState<{ reason: 'unauthenticated' | 'forbidden' } | null>(null);

  const searchMutation = useMutation({
    mutationFn: (params: Parameters<typeof patientsApi.search>[0]) => patientsApi.search(params),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setDenied({ reason: 'unauthenticated' });
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setDenied({ reason: 'forbidden' });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Falha ao buscar pacientes.');
    },
  });

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!name && !cpf && !cns && !mrn) return;
    setDenied(null);
    searchMutation.mutate({
      ...(name ? { name } : {}),
      ...(cpf ? { cpf } : {}),
      ...(cns ? { cns } : {}),
      ...(mrn ? { mrn } : {}),
    });
  };

  if (denied) return <AccessDeniedPage reason={denied.reason} />;

  const loading = searchMutation.isPending;
  const results = searchMutation.data ?? null;

  return (
    <main aria-labelledby="patient-search-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="patient-search-heading">Buscar paciente</h1>
          <p>
            Busque por nome, CPF, CNS ou número de prontuário antes de cadastrar — evita
            duplicidade e abertura equivocada de prontuário (Doc 1 §11/§12).
          </p>
        </div>
        <Button asChild variant="secondary">
          <a href="#/pacientes/novo">+ Cadastrar novo paciente</a>
        </Button>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="search-name">Nome</label>
        <input id="search-name" value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="search-cpf">CPF</label>
        <input id="search-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />

        <label htmlFor="search-cns">CNS</label>
        <input id="search-cns" value={cns} onChange={(e) => setCns(e.target.value)} />

        <label htmlFor="search-mrn">Número de prontuário</label>
        <input id="search-mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} />

        <Button type="submit" className="mt-4" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </Button>
      </form>

      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Carregando…</p>}

      {results !== null && results.length === 0 && (
        <EmptyState
          className="mt-4"
          title="Nenhum paciente encontrado"
          description="Ajuste os critérios de busca ou cadastre um novo paciente."
        />
      )}

      {results !== null && results.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="text-sm font-semibold text-muted-foreground">Resultados da busca</CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Nome</th>
                  <th className="p-3 font-semibold">Nome social</th>
                  <th className="p-3 font-semibold">Prontuário</th>
                  <th className="p-3 font-semibold">Nascimento</th>
                  <th className="p-3 font-semibold">CPF</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{p.fullName}</td>
                    <td className="p-3">{p.socialName ?? '—'}</td>
                    <td className="p-3 font-mono">{p.medicalRecordNumber}</td>
                    <td className="p-3">{p.birthDate ?? '—'}</td>
                    <td className="p-3">{maskCpf(p.cpf)}</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="secondary">
                        <a href={`#/pacientes/${p.id}`}>Abrir prontuário</a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </main>
  );
};
