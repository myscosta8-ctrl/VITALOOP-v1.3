import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createBedApi, type BedSectorData } from '../lib/bed-api.js';

export const BedSectorSettingsPage = (): JSX.Element => {
  const { api } = useSession();
  const bedApi = createBedApi(api);

  const [sectors, setSectors] = useState<readonly BedSectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await bedApi.getSectors();
      setSectors(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao carregar setores.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || capacity < 1) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      await bedApi.createSector(name.trim(), code.trim(), capacity, description.trim() || null);
      setName('');
      setCode('');
      setCapacity(1);
      setDescription('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao criar setor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main aria-labelledby="bed-settings-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="bed-settings-heading">Configurações de Leitos</h1>
          <p>Setores assistenciais e capacidade de leitos da unidade</p>
        </div>
      </div>

      {errorMessage && <div role="alert">{errorMessage}</div>}

      <div className="vl-panel">
        <div className="vl-panel-head">
          <h2>Setores cadastrados</h2>
        </div>
        {loading ? (
          <p role="status" className="vl-panel-body">Carregando setores...</p>
        ) : sectors.length === 0 ? (
          <p role="status" className="vl-panel-body">Nenhum setor cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Capacidade</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="vl-mono">{s.code}</td>
                  <td className="vl-mono">{s.capacity}</td>
                  <td>{s.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="vl-panel" style={{ marginTop: 'var(--space-4)' }}>
        <div className="vl-panel-head">
          <h2>Novo setor</h2>
        </div>
        <div className="vl-panel-body">
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

            <button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar setor'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
