import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createStaffAccountsApi,
  type StaffAccount,
  type StaffRole,
  type StaffSector,
} from '../lib/staff-accounts-api.js';

export const StaffAccountsPage = (): JSX.Element => {
  const { api } = useSession();
  const staffAccountsApi = createStaffAccountsApi(api);

  const [accounts, setAccounts] = useState<readonly StaffAccount[]>([]);
  const [roles, setRoles] = useState<readonly StaffRole[]>([]);
  const [sectors, setSectors] = useState<readonly StaffSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [accountsData, rolesData, sectorsData] = await Promise.all([
        staffAccountsApi.listAccounts(),
        staffAccountsApi.listRoles(),
        staffAccountsApi.listSectors(),
      ]);
      setAccounts(accountsData);
      setRoles(rolesData);
      setSectors(sectorsData);
      setRoleCode((v) => v || rolesData[0]?.code || '');
      setSectorId((v) => v || sectorsData[0]?.id || '');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao carregar profissionais.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password || !roleCode || !sectorId) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await staffAccountsApi.createAccount({ name: name.trim(), username: username.trim(), password, roleCode, sectorId });
      setSuccessMessage(`Conta de ${name.trim()} criada com sucesso.`);
      setName('');
      setUsername('');
      setPassword('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao criar conta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main aria-labelledby="staff-accounts-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="staff-accounts-heading">Gerenciar Profissionais</h1>
          <p>Cadastro de conta de login, papel e setor de lotação de cada profissional.</p>
        </div>
      </div>

      {errorMessage && <div role="alert">{errorMessage}</div>}
      {successMessage && <p role="status">{successMessage}</p>}
      {loading && <p role="status">Carregando profissionais...</p>}

      <div className="vl-panel">
        <div className="vl-panel-head">
          <h2>Profissionais cadastrados</h2>
        </div>
        {accounts.length === 0 && !loading ? (
          <p role="status" className="vl-panel-body">Nenhum profissional cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Setor</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="vl-mono">{a.username}</td>
                  <td>{a.roles.join(', ') || '—'}</td>
                  <td>{a.sectors.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="vl-panel-body">
          <form onSubmit={(e) => void onSubmit(e)} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 480 }}>
            <label htmlFor="staff-name">Nome completo</label>
            <input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />

            <label htmlFor="staff-username">Usuário (login)</label>
            <input
              id="staff-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex.: jsilva"
              required
            />

            <label htmlFor="staff-password">Senha inicial</label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <label htmlFor="staff-role">Papel</label>
            <select id="staff-role" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>

            <label htmlFor="staff-sector">Setor de lotação</label>
            <select id="staff-sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button type="submit" disabled={saving}>
              {saving ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
