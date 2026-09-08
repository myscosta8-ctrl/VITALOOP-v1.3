import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createStaffScheduleApi,
  type LeaveType,
  type StaffLeave,
  type StaffShift,
  type StaffUser,
} from '../lib/staff-schedule-api.js';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ferias: 'Férias',
  atestado: 'Atestado médico',
  licenca: 'Licença',
  outro: 'Outro',
};

export const StaffSchedulePage = (): JSX.Element => {
  const { api } = useSession();
  const staffApi = createStaffScheduleApi(api);

  const [users, setUsers] = useState<readonly StaffUser[]>([]);
  const [leaves, setLeaves] = useState<readonly StaffLeave[]>([]);
  const [shifts, setShifts] = useState<readonly StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [leaveUserId, setLeaveUserId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('ferias');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [savingLeave, setSavingLeave] = useState(false);

  const [shiftUserId, setShiftUserId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftPeriod, setShiftPeriod] = useState('Diurno (07h-19h)');
  const [savingShift, setSavingShift] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [usersData, leavesData, shiftsData] = await Promise.all([
        staffApi.listUsers(),
        staffApi.listLeaves(),
        staffApi.listShifts(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      if (usersData.length > 0) {
        setLeaveUserId((v) => v || usersData[0]!.id);
        setShiftUserId((v) => v || usersData[0]!.id);
      }
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao carregar escala de profissionais.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmitLeave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!leaveUserId || !leaveStart || !leaveEnd) return;

    setSavingLeave(true);
    setErrorMessage(null);
    try {
      await staffApi.createLeave(leaveUserId, leaveType, leaveStart, leaveEnd);
      setLeaveStart('');
      setLeaveEnd('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao registrar férias/afastamento.');
    } finally {
      setSavingLeave(false);
    }
  };

  const onDeleteLeave = async (id: string): Promise<void> => {
    try {
      await staffApi.deleteLeave(id);
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao remover registro.');
    }
  };

  const onSubmitShift = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!shiftUserId || !shiftDate || !shiftPeriod.trim()) return;

    setSavingShift(true);
    setErrorMessage(null);
    try {
      await staffApi.createShift(shiftUserId, shiftDate, shiftPeriod.trim());
      setShiftDate('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao registrar plantão.');
    } finally {
      setSavingShift(false);
    }
  };

  const onDeleteShift = async (id: string): Promise<void> => {
    try {
      await staffApi.deleteShift(id);
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Falha ao remover plantão.');
    }
  };

  return (
    <main aria-labelledby="staff-schedule-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="staff-schedule-heading">Escala de Profissionais</h1>
          <p>Plantões e férias/afastamentos — substitui o controle por planilha</p>
        </div>
      </div>

      {errorMessage && <div role="alert">{errorMessage}</div>}
      {loading && <p role="status">Carregando escala...</p>}

      <div className="vl-panel">
        <div className="vl-panel-head">
          <h2>Férias e afastamentos</h2>
        </div>
        {leaves.length === 0 && !loading ? (
          <p role="status" className="vl-panel-body">Nenhum período registrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Servidor</th>
                <th>Tipo</th>
                <th>Início</th>
                <th>Fim</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.userName}</td>
                  <td><span className="vl-badge vl-badge-info">{LEAVE_TYPE_LABEL[l.leaveType]}</span></td>
                  <td className="vl-mono">{l.startDate}</td>
                  <td className="vl-mono">{l.endDate}</td>
                  <td>
                    <button className="vl-btn-sm vl-btn-danger" onClick={() => void onDeleteLeave(l.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="vl-panel-body">
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

            <button type="submit" disabled={savingLeave}>
              {savingLeave ? 'Salvando...' : 'Registrar período'}
            </button>
          </form>
        </div>
      </div>

      <div className="vl-panel" style={{ marginTop: 'var(--space-4)' }}>
        <div className="vl-panel-head">
          <h2>Escala de plantão</h2>
        </div>
        {shifts.length === 0 && !loading ? (
          <p role="status" className="vl-panel-body">Nenhum plantão escalado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Servidor</th>
                <th>Data</th>
                <th>Turno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.userName}</td>
                  <td className="vl-mono">{s.shiftDate}</td>
                  <td>{s.shiftPeriod}</td>
                  <td>
                    <button className="vl-btn-sm vl-btn-danger" onClick={() => void onDeleteShift(s.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="vl-panel-body">
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

            <button type="submit" disabled={savingShift}>
              {savingShift ? 'Salvando...' : 'Escalar plantão'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
