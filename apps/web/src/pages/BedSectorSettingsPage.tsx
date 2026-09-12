import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createBedApi } from '../lib/bed-api.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

const errMsg = (err: unknown, fallback: string): string => (err instanceof ApiError ? err.message : fallback);

export const BedSectorSettingsPage = (): JSX.Element => {
  const { api } = useSession();
  const bedApi = createBedApi(api);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [description, setDescription] = useState('');

  const sectorsQuery = useQuery({
    queryKey: ['bed-sectors'],
    queryFn: async () => {
      const data = await bedApi.getSectors();
      return Array.isArray(data) ? data : [];
    },
  });

  const sectors = sectorsQuery.data ?? [];
  const loading = sectorsQuery.isLoading;
  const errorMessage = sectorsQuery.isError ? errMsg(sectorsQuery.error, 'Falha ao carregar setores.') : null;

  const createSectorMutation = useMutation({
    mutationFn: () => bedApi.createSector(name.trim(), code.trim(), capacity, description.trim() || null),
    onSuccess: () => {
      setName('');
      setCode('');
      setCapacity(1);
      setDescription('');
      toast.success('Setor criado com sucesso.');
      return queryClient.invalidateQueries({ queryKey: ['bed-sectors'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao criar setor.')),
  });

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || capacity < 1) return;
    createSectorMutation.mutate();
  };

  return (
    <main aria-labelledby="bed-settings-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="bed-settings-heading">Configurações de Leitos</h1>
          <p>Setores assistenciais e capacidade de leitos da unidade</p>
        </div>
      </div>

      {errorMessage && <div role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</div>}

      <Card>
        <CardHeader className="text-sm font-semibold text-muted-foreground">Setores cadastrados</CardHeader>
        {loading ? (
          <CardContent><p role="status" className="text-sm text-muted-foreground">Carregando setores...</p></CardContent>
        ) : sectors.length === 0 ? (
          <CardContent><EmptyState className="border-none p-0" title="Nenhum setor cadastrado ainda" /></CardContent>
        ) : (
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Nome</th>
                  <th className="p-3 font-semibold">Código</th>
                  <th className="p-3 font-semibold">Capacidade</th>
                  <th className="p-3 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3 font-mono">{s.code}</td>
                    <td className="p-3 font-mono">{s.capacity}</td>
                    <td className="p-3">{s.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Novo setor</CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 480 }}>
            <label htmlFor="sector-name">Nome do setor</label>
            <input id="sector-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sala Amarela" />

            <label htmlFor="sector-code">Código</label>
            <input id="sector-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: SALA_AMARELA" />

            <label htmlFor="sector-capacity">Capacidade (nº de leitos)</label>
            <input
              id="sector-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />

            <label htmlFor="sector-description">Descrição (opcional)</label>
            <input id="sector-description" value={description} onChange={(e) => setDescription(e.target.value)} />

            <Button type="submit" className="mt-4" disabled={createSectorMutation.isPending}>
              {createSectorMutation.isPending ? 'Salvando...' : 'Criar setor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
