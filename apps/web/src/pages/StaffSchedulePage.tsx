import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createStaffScheduleApi,
  type LeaveType,
  type StaffLeave,
  type StaffShift,
} from '../lib/staff-schedule-api.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ferias: 'Férias',
  atestado: 'Atestado médico',
  licenca: 'Licença',
  outro: 'Outro',
};

const errMsg = (err: unknown, fallback: string): string => (err instanceof ApiError ? err.message : fallback);

export const StaffSchedulePage = (): JSX.Element => {
  const { api } = useSession();
  const staffApi = createStaffScheduleApi(api);
  const queryClient = useQueryClient();

  const [leaveUserId, setLeaveUserId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('ferias');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');

  const [shiftUserId, setShiftUserId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftPeriod, setShiftPeriod] = useState('Diurno (07h-19h)');

  const usersQuery = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const data = await staffApi.listUsers();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        setLeaveUserId((v) => v || list[0]!.id);
        setShiftUserId((v) => v || list[0]!.id);
      }
      return list;
    },
  });
  const leavesQuery = useQuery({
    queryKey: ['staff-leaves'],
    queryFn: async () => {
      const data = await staffApi.listLeaves();
      return (Array.isArray(data) ? data : []) as readonly StaffLeave[];
    },
  });
  const shiftsQuery = useQuery({
    queryKey: ['staff-shifts'],
    queryFn: async () => {
      const data = await staffApi.listShifts();
      return (Array.isArray(data) ? data : []) as readonly StaffShift[];
    },
  });

  const users = usersQuery.data ?? [];
  const leaves = leavesQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const loading = usersQuery.isLoading || leavesQuery.isLoading || shiftsQuery.isLoading;
  const errorMessage = usersQuery.isError
    ? errMsg(usersQuery.error, 'Falha ao carregar escala de profissionais.')
    : leavesQuery.isError
      ? errMsg(leavesQuery.error, 'Falha ao carregar escala de profissionais.')
      : shiftsQuery.isError
        ? errMsg(shiftsQuery.error, 'Falha ao carregar escala de profissionais.')
        : null;

  const createLeaveMutation = useMutation({
    mutationFn: () => staffApi.createLeave(leaveUserId, leaveType, leaveStart, leaveEnd),
    onSuccess: () => {
      setLeaveStart('');
      setLeaveEnd('');
      toast.success('Período registrado.');
      return queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao registrar férias/afastamento.')),
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: string) => staffApi.deleteLeave(id),
    onSuccess: () => {
      toast.success('Registro removido.');
      return queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao remover registro.')),
  });

  const createShiftMutation = useMutation({
    mutationFn: () => staffApi.createShift(shiftUserId, shiftDate, shiftPeriod.trim()),
    onSuccess: () => {
      setShiftDate('');
      toast.success('Plantão escalado.');
      return queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao registrar plantão.')),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => staffApi.deleteShift(id),
    onSuccess: () => {
      toast.success('Plantão removido.');
      return queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao remover plantão.')),
  });

  const onSubmitLeave = (e: FormEvent): void => {
    e.preventDefault();
    if (!leaveUserId || !leaveStart || !leaveEnd) return;
    createLeaveMutation.mutate();
  };

  const onSubmitShift = (e: FormEvent): void => {
    e.preventDefault();
    if (!shiftUserId || !shiftDate || !shiftPeriod.trim()) return;
    createShiftMutation.mutate();
  };

  return (
    <main aria-labelledby="staff-schedule-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="staff-schedule-heading">Escala de Profissionais</h1>
          <p>Plantões e férias/afastamentos — substitui o controle por planilha</p>
        </div>
      </div>

      {errorMessage && <div role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</div>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Carregando escala...</p>}

      <Card>
        <CardHeader className="text-sm font-semibold text-muted-foreground">Férias e afastamentos</CardHeader>
        {leaves.length === 0 && !loading ? (
          <CardContent><EmptyState className="border-none p-0" title="Nenhum período registrado ainda" /></CardContent>
        ) : (
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Servidor</th>
                  <th className="p-3 font-semibold">Tipo</th>
                  <th className="p-3 font-semibold">Início</th>
                  <th className="p-3 font-semibold">Fim</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-3">{l.userName}</td>
                    <td className="p-3"><Badge variant="secondary">{LEAVE_TYPE_LABEL[l.leaveType]}</Badge></td>
                    <td className="p-3 font-mono">{l.startDate}</td>
                    <td className="p-3 font-mono">{l.endDate}</td>
                    <td className="p-3">
                      <Button size="sm" variant="destructive" onClick={() => deleteLeaveMutation.mutate(l.id)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
        <CardContent>
          <form onSubmit={(e) => void onSubmitLeave(e)} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 480 }}>
            <label htmlFor="leave-user">Servidor</label>
            <select id="leave-user" value={leaveUserId} onChange={(e) => setLeaveUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.roles.length > 0 ? `(${u.roles.join(', ')})` : ''}
                </option>
              ))}
            </select>

            <label htmlFor="leave-type">Tipo</label>
            <select id="leave-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
              {Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <label htmlFor="leave-start">Início</label>
            <input id="leave-start" type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />

            <label htmlFor="leave-end">Fim</label>
            <input id="leave-end" type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />

            <Button type="submit" className="mt-4" disabled={createLeaveMutation.isPending}>
              {createLeaveMutation.isPending ? 'Salvando...' : 'Registrar período'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Escala de plantão</CardHeader>
        {shifts.length === 0 && !loading ? (
          <CardContent><EmptyState className="border-none p-0" title="Nenhum plantão escalado ainda" /></CardContent>
        ) : (
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Servidor</th>
                  <th className="p-3 font-semibold">Data</th>
                  <th className="p-3 font-semibold">Turno</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">{s.userName}</td>
                    <td className="p-3 font-mono">{s.shiftDate}</td>
                    <td className="p-3">{s.shiftPeriod}</td>
                    <td className="p-3">
                      <Button size="sm" variant="destructive" onClick={() => deleteShiftMutation.mutate(s.id)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
        <CardContent>
          <form onSubmit={(e) => void onSubmitShift(e)} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 480 }}>
            <label htmlFor="shift-user">Servidor</label>
            <select id="shift-user" value={shiftUserId} onChange={(e) => setShiftUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.roles.length > 0 ? `(${u.roles.join(', ')})` : ''}
                </option>
              ))}
            </select>

            <label htmlFor="shift-date">Data</label>
            <input id="shift-date" type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />

            <label htmlFor="shift-period">Turno</label>
            <input
              id="shift-period"
              value={shiftPeriod}
              onChange={(e) => setShiftPeriod(e.target.value)}
              placeholder="Ex.: Diurno (07h-19h)"
            />

            <Button type="submit" className="mt-4" disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending ? 'Salvando...' : 'Escalar plantão'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
