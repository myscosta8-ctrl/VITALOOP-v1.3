import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createStaffAccountsApi,
  type StaffAccount,
  type StaffRole,
  type StaffSector,
} from '../lib/staff-accounts-api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Select } from '../components/ui/select.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

export const StaffAccountsPage = (): JSX.Element => {
  const { api } = useSession();
  const staffAccountsApi = createStaffAccountsApi(api);

  const [accounts, setAccounts] = useState<readonly StaffAccount[]>([]);
  const [roles, setRoles] = useState<readonly StaffRole[]>([]);
  const [sectors, setSectors] = useState<readonly StaffSector[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
      toast.error(err instanceof ApiError ? err.message : 'Falha ao carregar profissionais.');
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
    try {
      await staffAccountsApi.createAccount({ name: name.trim(), username: username.trim(), password, roleCode, sectorId });
      toast.success(`Conta de ${name.trim()} criada com sucesso.`);
      setName('');
      setUsername('');
      setPassword('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar conta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main aria-labelledby="staff-accounts-heading" className="space-y-5">
      <div className="vl-page-head">
        <div>
          <h1 id="staff-accounts-heading">Gerenciar Profissionais</h1>
          <p>Cadastro de conta de login, papel e setor de lotação de cada profissional.</p>
        </div>
      </div>

      {loading && <p role="status" className="text-sm text-muted-foreground">Carregando profissionais...</p>}

      <Card>
        <CardHeader>
          <CardTitle>Profissionais cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 && !loading ? (
            <EmptyState title="Nenhum profissional cadastrado ainda." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Usuário</th>
                  <th className="py-2 pr-3 font-medium">Papel</th>
                  <th className="py-2 pr-3 font-medium">Setor</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{a.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{a.username}</td>
                    <td className="py-2 pr-3">{a.roles.join(', ') || '—'}</td>
                    <td className="py-2 pr-3">{a.sectors.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="max-w-none space-y-3 border-0 bg-transparent p-0 shadow-none">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Nome completo</Label>
              <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-username">Usuário (login)</Label>
              <Input
                id="staff-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex.: jsilva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-password">Senha inicial</Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Papel</Label>
              <Select id="staff-role" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-sector">Setor de lotação</Label>
              <Select id="staff-sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
